import webpush from "web-push";

const RSS_URL = "https://www.animenewsnetwork.com/all/rss.xml";
const LAST_SEEN_KEY = "last-seen-links";
const MAX_TRACKED_LINKS = 50;

export default {
  // Manual trigger for testing (GET /check) — mirrors the scheduled logic
  // exactly so it can be verified without waiting for the real cron.
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/check") {
      const result = await checkForNewArticlesAndNotify(env);
      return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
    }
    return new Response("autoshort-push-worker", { status: 200 });
  },

  async scheduled(event, env) {
    await checkForNewArticlesAndNotify(env);
  },
};

async function checkForNewArticlesAndNotify(env) {
  const res = await fetch(RSS_URL);
  if (!res.ok) return { error: "rss fetch failed", status: res.status };

  const xml = await res.text();
  const articles = parseRssItems(xml).slice(0, 20);
  if (articles.length === 0) return { checked: 0, newArticles: 0 };

  const lastSeenRaw = await env.PUSH_KV.get(LAST_SEEN_KEY);
  const lastSeen = lastSeenRaw ? JSON.parse(lastSeenRaw) : [];
  const lastSeenSet = new Set(lastSeen);

  const newArticles = articles.filter((a) => !lastSeenSet.has(a.link));

  // Always refresh the tracked-links window so old articles don't
  // re-trigger a notification, even on the very first run.
  const updatedSeen = [...new Set([...articles.map((a) => a.link), ...lastSeen])].slice(0, MAX_TRACKED_LINKS);
  await env.PUSH_KV.put(LAST_SEEN_KEY, JSON.stringify(updatedSeen));

  // First run ever (no prior state): don't blast a notification for every
  // existing article, just establish the baseline.
  if (lastSeenRaw === null) return { checked: articles.length, newArticles: 0, firstRun: true };
  if (newArticles.length === 0) return { checked: articles.length, newArticles: 0 };

  const subscriptions = await getAllSubscriptions(env);
  const latest = newArticles[0];
  const payload = JSON.stringify({
    title: newArticles.length === 1 ? "Nouvelle actu anime/manga" : `${newArticles.length} nouvelles actus anime/manga`,
    body: latest.title,
    url: "./",
  });

  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

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

  return { checked: articles.length, newArticles: newArticles.length, subscriptions: subscriptions.length, sent, removed };
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

function parseRssItems(xml) {
  const items = [];
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

  for (const block of itemBlocks) {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    if (title && link) items.push({ title, link });
  }

  return items;
}

function extractTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  if (!match) return "";
  return match[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}
