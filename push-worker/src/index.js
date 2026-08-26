import webpush from "web-push";

// Scores come from the Pages /news endpoint rather than a raw RSS feed, so
// the worker ranks stories with exactly the same popularity model the app
// shows — one source of truth instead of two diverging ones.
const NEWS_URL = "https://autoshort-2ym.pages.dev/news";
const TOP_ARTICLE_KEY = "top-article";

export default {
  // Manual trigger for testing (GET /check) — mirrors the scheduled logic
  // exactly so it can be verified without waiting for the real cron.
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/check") {
      const result = await checkTopArticleAndNotify(env);
      return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
    }
    return new Response("autoshort-push-worker", { status: 200 });
  },

  async scheduled(event, env) {
    await checkTopArticleAndNotify(env);
  },
};

// Notifies only about the single most popular story currently available, and
// only when that story changes — either because a higher-scoring one was
// published, or because the previous leader dropped out of the feed. A steady
// stream of minor news therefore produces no notification at all.
async function checkTopArticleAndNotify(env) {
  const res = await fetch(NEWS_URL);
  if (!res.ok) return { error: "news fetch failed", status: res.status };

  const data = await res.json();
  const articles = data.articles || [];
  if (articles.length === 0) return { checked: 0, notified: false };

  // The endpoint already sorts by popularity, but sorting here keeps the
  // worker correct even if that ever changes.
  const top = [...articles].sort((a, b) => (b.popularity || 0) - (a.popularity || 0))[0];

  const previousRaw = await env.PUSH_KV.get(TOP_ARTICLE_KEY);
  const previous = previousRaw ? JSON.parse(previousRaw) : null;

  await env.PUSH_KV.put(
    TOP_ARTICLE_KEY,
    JSON.stringify({ link: top.link, title: top.title, popularity: top.popularity })
  );

  // First run ever: establish the baseline without notifying.
  if (previous === null) {
    return { checked: articles.length, notified: false, firstRun: true, top: top.title };
  }

  // Same leader as last check: nothing to announce.
  if (previous.link === top.link) {
    return { checked: articles.length, notified: false, top: top.title };
  }

  const overtook = (top.popularity || 0) > (previous.popularity || 0);
  const payload = JSON.stringify({
    title: overtook ? "🔥 Nouvelle actu n°1" : "Nouvelle actu en tête",
    body: top.title,
    url: "./",
  });

  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

  const subscriptions = await getAllSubscriptions(env);
  let sent = 0;
  let removed = 0;
  for (const { key, subscription } of subscriptions) {
    try {
      await webpush.sendNotification(subscription, payload);
      sent++;
    } catch (err) {
      // 404/410 means the browser unsubscribed or the subscription expired.
      if (err.statusCode === 404 || err.statusCode === 410) {
        await env.PUSH_KV.delete(key);
        removed++;
      }
    }
  }

  return {
    checked: articles.length,
    notified: true,
    overtook,
    top: top.title,
    score: top.popularity,
    previousScore: previous.popularity,
    subscriptions: subscriptions.length,
    sent,
    removed,
  };
}

async function getAllSubscriptions(env) {
  const list = await env.PUSH_KV.list({ prefix: "sub:" });
  const subscriptions = [];
  for (const key of list.keys) {
    const raw = await env.PUSH_KV.get(key.name);
    if (raw) subscriptions.push({ key: key.name, subscription: JSON.parse(raw) });
  }
  return subscriptions;
}
