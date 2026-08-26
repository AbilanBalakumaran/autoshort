import { json, corsHeaders } from "./_utils.js";

// MyAnimeList's news feed is curated to be anime-only (no games, no
// live-action, no reviews) and already writes substantial multi-sentence
// descriptions with a thumbnail baked in — the best primary source. The
// others are merged in for volume/variety, each filtered down to genuine
// anime news (releases, new seasons, mangaka/staff announcements) using
// whatever signal that source exposes (categories where available, title
// keywords otherwise).
const MAL_RSS_URL = "https://myanimelist.net/rss/news.xml";
const ANN_RSS_URL = "https://www.animenewsnetwork.com/all/rss.xml";
const ANIME_CORNER_RSS_URL = "https://animecorner.me/feed/";
const OTAKU_USA_RSS_URL = "https://www.otakuusamagazine.com/feed";
const MAX_ITEMS = 50;

// ANN's "all" feed mixes in games/reviews/conventions — filter by keyword
// since it has no reliable per-item category in the feed itself.
const EXCLUDE_KEYWORDS = [
  " game", "playstation", "nintendo", "xbox", "steam",
  "stage play", "live-action", "live action", " review",
  "convention", "expo", "arcade", "figure", "concert",
  "box office", "cosplay", "ranking", "this week in",
];

// Otaku USA's own categories cleanly separate reviews/interviews/features
// from actual news — much more reliable than keyword-guessing.
const OTAKU_USA_EXCLUDE_CATEGORIES = ["review", "interview", "feature", "kickstarter", "op-ed"];

// ---------------------------------------------------------------------------
// Popularity scoring
//
// A short's audience is driven far more by WHICH franchise it covers and WHAT
// kind of event it is than by how recent the news is, so each article gets a
// 0-100 score built from three independent signals. None of them costs an
// extra network request: everything is derived from data already fetched.
// ---------------------------------------------------------------------------

// Signal 1 — franchise weight. Two tiers, because the gap in reach between a
// One Piece announcement and a mid-card seasonal show is enormous.
const FRANCHISES_TIER_S = [
  "one piece", "jujutsu kaisen", "demon slayer", "kimetsu no yaiba",
  "chainsaw man", "solo leveling", "attack on titan", "shingeki no kyojin",
  "my hero academia", "boku no hero", "dragon ball", "naruto", "boruto",
  "spy x family", "frieren", "dandadan", "sakamoto days", "kaiju no. 8",
  "bleach", "pokemon", "pokémon",
];
const FRANCHISES_TIER_A = [
  "blue lock", "oshi no ko", "tokyo revengers", "hunter x hunter",
  "evangelion", "death note", "fullmetal alchemist", "mob psycho",
  "haikyu", "vinland saga", "made in abyss", "re:zero", "konosuba",
  "overlord", "mushoku tensei", "wind breaker", "gachiakuta",
  "one punch man", "fire force", "black clover", "dr. stone",
  "apothecary diaries", "kusuriya", "blue box", "shangri-la frontier",
  "ranma", "yu-gi-oh", "digimon", "gintama", "bocchi", "lycoris",
  "sailor moon", "toilet-bound", "jibaku shounen", "zenshu",
];

// Signal 2 — event type. Announcements and trailers travel; routine
// scheduling notes do not.
const EVENT_WEIGHTS = [
  [25, ["new season", "season 2", "season 3", "season 4", "season 5", "final season"]],
  [22, ["anime adaptation", "gets anime", "anime announced", "greenlit"]],
  [18, ["trailer", "teaser", "first look", "key visual", "pv "]],
  [16, ["final arc", "finale", "ends", "concludes", "last chapter", "hiatus"]],
  [14, ["release date", "premiere", "debuts", "returns", "confirmed"]],
  [12, ["movie", "film", "sequel", "spin-off", "spinoff", "remake"]],
  [10, ["record", "million", "best-selling", "top ", "biggest", "anniversary"]],
  [8, ["cast", "voice actor", "studio", "director", "collab"]],
];

// Signal 3 — cross-source corroboration. When several independent outlets run
// the same story within the same feed window, that story is genuinely
// breaking. This used to be thrown away by the deduplication step.
const SOURCE_CORROBORATION_WEIGHT = 20;

// At or above this score an article counts as "hot" and earns the longer
// retention window on the client.
const HOT_SCORE_THRESHOLD = 55;

function scoreArticle(article, sourceCount) {
  const haystack = `${article.title} ${article.description || ""}`.toLowerCase();
  let score = 0;

  if (FRANCHISES_TIER_S.some((f) => haystack.includes(f))) score += 40;
  else if (FRANCHISES_TIER_A.some((f) => haystack.includes(f))) score += 24;

  // Only the strongest matching event type counts, so an article isn't
  // inflated just for mentioning several stock phrases.
  for (const [weight, keywords] of EVENT_WEIGHTS) {
    if (keywords.some((kw) => haystack.includes(kw))) {
      score += weight;
      break;
    }
  }

  score += Math.min(2, sourceCount - 1) * SOURCE_CORROBORATION_WEIGHT;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestGet() {
  try {
    const results = await Promise.all([
      fetchMalNews(),
      fetchAnnNews(),
      fetchAnimeCornerNews(),
      fetchOtakuUsaNews(),
    ]);

    // Sorted by popularity first so that when the list is capped at
    // MAX_ITEMS it's the low-scoring filler that gets cut, not a big
    // announcement that happened to be a few hours older. The client
    // regroups by date afterwards.
    const merged = mergeDuplicates(results.flat())
      .sort((a, b) => b.popularity - a.popularity || new Date(b.pubDate) - new Date(a.pubDate))
      .slice(0, MAX_ITEMS);

    return json({ articles: merged, hotThreshold: HOT_SCORE_THRESHOLD });
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
    // Capped before the per-article og:image fetch — Cloudflare Pages
    // Functions have a subrequest-per-invocation limit, and this endpoint
    // now scrapes two sources' article pages in the same request.
    const items = parseRssItems(xml)
      .filter((item) => !hasExcludedKeyword(item.title))
      .slice(0, 15);

    return await Promise.all(
      items.map(async (item) => ({
        title: item.title,
        link: item.link,
        description: item.description,
        pubDate: item.pubDate,
        image: await fetchOgMeta(item.link).then((m) => m.image),
        source: "Anime News Network",
      }))
    );
  } catch {
    return [];
  }
}

async function fetchAnimeCornerNews() {
  try {
    const res = await fetch(ANIME_CORNER_RSS_URL);
    if (!res.ok) return [];
    const xml = await res.text();
    // Anime Corner tags each post's category in the feed itself — much
    // more reliable than guessing from the title, and its RSS description
    // is empty, so pull both image and a real description from the page.
    // Capped before the per-article fetch for the same subrequest-limit
    // reason as the ANN branch above.
    const items = parseRssItems(xml)
      .filter((item) => item.categories.includes("anime news") && !hasExcludedKeyword(item.title))
      .slice(0, 10);

    return await Promise.all(
      items.map(async (item) => {
        const meta = await fetchOgMeta(item.link);
        return {
          title: item.title,
          link: item.link,
          description: meta.description || item.description,
          pubDate: item.pubDate,
          image: meta.image,
          source: "Anime Corner",
        };
      })
    );
  } catch {
    return [];
  }
}

async function fetchOtakuUsaNews() {
  try {
    const res = await fetch(OTAKU_USA_RSS_URL);
    if (!res.ok) return [];
    const xml = await res.text();
    const items = parseRssItems(xml).filter(
      (item) => !OTAKU_USA_EXCLUDE_CATEGORIES.some((c) => item.categories.some((cat) => cat.includes(c)))
    );

    return items.map((item) => ({
      title: item.title,
      link: item.link,
      description: item.description,
      pubDate: item.pubDate,
      image: item.contentImage,
      source: "Otaku USA Magazine",
    }));
  } catch {
    return [];
  }
}

function hasExcludedKeyword(title) {
  const lower = title.toLowerCase();
  return EXCLUDE_KEYWORDS.some((kw) => lower.includes(kw));
}

// Keeps one article per story, but remembers how many distinct outlets ran
// it — that count feeds the popularity score instead of being discarded.
// Titles are normalized first so near-identical headlines from different
// outlets ("Chainsaw Man Season 2 Announced" vs "Chainsaw Man season 2
// announced!") collapse onto the same story.
function mergeDuplicates(articles) {
  const byStory = new Map();

  for (const article of articles) {
    const key = normalizeTitle(article.title);
    const existing = byStory.get(key);
    if (!existing) {
      byStory.set(key, { article, sources: new Set([article.source]) });
      continue;
    }
    existing.sources.add(article.source);
    // Prefer whichever copy actually has an image and a real description.
    if (!existing.article.image && article.image) existing.article.image = article.image;
    if (!existing.article.description && article.description) {
      existing.article.description = article.description;
    }
  }

  return [...byStory.values()].map(({ article, sources }) => ({
    ...article,
    sourceCount: sources.size,
    popularity: scoreArticle(article, sources.size),
    hot: scoreArticle(article, sources.size) >= HOT_SCORE_THRESHOLD,
  }));
}

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
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

    const contentEncodedMatch = block.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/);
    const imgMatch = contentEncodedMatch ? contentEncodedMatch[1].match(/<img[^>]+src=["']([^"']+)["']/i) : null;
    const contentImage = imgMatch ? imgMatch[1] : null;

    const categories = [...block.matchAll(/<category>(?:<!\[CDATA\[)?([^<\]]*)/g)].map((m) =>
      m[1].trim().toLowerCase()
    );

    if (title && link) {
      items.push({ title, link, description, pubDate, thumbnail, contentImage, categories });
    }
  }

  return items;
}

function extractTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  if (!match) return "";
  const unwrapped = match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1");
  return decodeHtmlEntities(unwrapped)
    .replace(/<[^>]+>/g, "")
    .trim();
}

async function fetchOgMeta(url) {
  try {
    // Some sites serve a bot-blocked/stripped page to requests without a
    // recognizable browser User-Agent (the default fetch() one gets
    // rejected by at least Anime Corner's protection).
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) return { image: null, description: null };
    const html = await res.text();
    const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
    return {
      image: imageMatch ? imageMatch[1] : null,
      description: descMatch ? decodeHtmlEntities(descMatch[1]) : null,
    };
  } catch {
    return { image: null, description: null };
  }
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
