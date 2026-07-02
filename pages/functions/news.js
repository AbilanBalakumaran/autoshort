import { json, corsHeaders } from "./_utils.js";

// MyAnimeList's news feed is curated to be anime-only (no games, no
// live-action, no reviews) and already writes substantial multi-sentence
// descriptions with a thumbnail baked in — a much better primary source
// than ANN's "all" feed, which mixes in games/reviews/conventions.
const MAL_RSS_URL = "https://myanimelist.net/rss/news.xml";
const ANN_RSS_URL = "https://www.animenewsnetwork.com/all/rss.xml";
const MAX_ITEMS = 40;

// ANN's feed needs filtering to stay on-topic (real anime news: releases,
// new seasons, mangaka/staff announcements) — these keywords flag the
// non-anime noise mixed into its "all" feed.
const EXCLUDE_KEYWORDS = [
  " game", "playstation", "nintendo", "xbox", "steam",
  "stage play", "live-action", "live action", " review",
  "convention", "expo", "arcade", "figure", "concert",
  "box office", "cosplay", "ranking", "this week in",
];

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestGet() {
  try {
    const [malArticles, annArticles] = await Promise.all([fetchMalNews(), fetchAnnNews()]);

    const merged = dedupeByTitle([...malArticles, ...annArticles])
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .slice(0, MAX_ITEMS);

    return json({ articles: merged });
  } catch (err) {
    return json({ error: "Flux d'actus indisponible", details: err.message || String(err) }, 502);
  }
}

async function fetchMalNews() {
  try {
    const res = await fetch(MAL_RSS_URL);
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssItems(xml).map((item) => ({
      title: item.title,
      link: item.link,
      description: item.description,
      pubDate: item.pubDate,
      image: item.thumbnail,
      source: "MyAnimeList",
    }));
  } catch {
    return [];
  }
}

async function fetchAnnNews() {
  try {
    const res = await fetch(ANN_RSS_URL);
    if (!res.ok) return [];
    const xml = await res.text();
    const items = parseRssItems(xml).filter((item) => isAnimeNews(item.title));

    return await Promise.all(
      items.map(async (item) => ({
        title: item.title,
        link: item.link,
        description: item.description,
        pubDate: item.pubDate,
        image: await fetchOgImage(item.link),
        source: "Anime News Network",
      }))
    );
  } catch {
    return [];
  }
}

function isAnimeNews(title) {
  const lower = title.toLowerCase();
  return !EXCLUDE_KEYWORDS.some((kw) => lower.includes(kw));
}

function dedupeByTitle(articles) {
  const seen = new Set();
  return articles.filter((a) => {
    const key = a.title.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseRssItems(xml) {
  const items = [];
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

  for (const block of itemBlocks) {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const description = extractTag(block, "description");
    const pubDate = extractTag(block, "pubDate");
    const thumbnailMatch = block.match(/<media:thumbnail>([^<]*)<\/media:thumbnail>/);
    const thumbnail = thumbnailMatch ? thumbnailMatch[1].trim() : null;

    if (title && link) {
      items.push({ title, link, description, pubDate, thumbnail });
    }
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
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, "")
    .trim();
}

async function fetchOgImage(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
