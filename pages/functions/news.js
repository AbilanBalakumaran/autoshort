import { json, corsHeaders } from "./_utils.js";

const RSS_URL = "https://www.animenewsnetwork.com/all/rss.xml";
const MAX_ITEMS = 24;

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestGet() {
  try {
    const res = await fetch(RSS_URL);
    if (!res.ok) return json({ error: "Flux d'actus indisponible" }, 502);

    const xml = await res.text();
    const items = parseRssItems(xml).slice(0, MAX_ITEMS);

    const withImages = await Promise.all(
      items.map(async (item) => ({ ...item, image: await fetchOgImage(item.link) }))
    );

    return json({ articles: withImages });
  } catch (err) {
    return json({ error: "Flux d'actus indisponible", details: err.message || String(err) }, 502);
  }
}

function parseRssItems(xml) {
  const items = [];
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

  for (const block of itemBlocks) {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const description = extractTag(block, "description");
    const pubDate = extractTag(block, "pubDate");

    if (title && link) {
      items.push({ title, link, description, pubDate });
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
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
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
