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
const ANIME_HUNCH_RSS_URL = "https://animehunch.com/feed/";
const SILICONERA_RSS_URL = "https://www.siliconera.com/feed/";
// Toy People (and its Denden sub-brand) publishes no feed and answers every
// article path with a Cloudflare bot challenge — 403 "Just a moment…", the
// same wall a Pages Function's fetch() would hit — so its YouTube channel is
// the only machine-readable window onto the outlet. Note that it is a
// Traditional Chinese toy/gashapon channel rather than an anime news desk:
// it contributes few usable stories, hence the small cap below.
const TOY_PEOPLE_YT_URL =
  "https://www.youtube.com/feeds/videos.xml?channel_id=UCA8bOZ87Klj_jGcue29Vitw";
const TOY_PEOPLE_MAX_ITEMS = 6;
const MAX_ITEMS = 50;

// ANN's "all" feed mixes in games/reviews/conventions — filter by keyword
// since it has no reliable per-item category in the feed itself.
const EXCLUDE_KEYWORDS = [
  " game", "playstation", "nintendo", "xbox", "steam",
  "stage play", "live-action", "live action", " review",
  "convention", "expo", "arcade", "figure", "concert",
  "box office", "cosplay", "ranking", "this week in",
  // Merch write-ups reach the feed tagged as anime news (a One Piece Happy
  // Meal scores as high as a One Piece announcement otherwise), but they
  // make poor shorts.
  "plush", "happy meal", "gashapon", "crocs", "merch", "keychain",
];

// Otaku USA's own categories cleanly separate reviews/interviews/features
// from actual news — much more reliable than keyword-guessing.
const OTAKU_USA_EXCLUDE_CATEGORIES = ["review", "interview", "feature", "kickstarter", "op-ed"];

// Anime Hunch tags its posts precisely, so an allow-list keeps the news and
// drops the op-eds ("industry insights", "industry speaks") and interviews.
const ANIME_HUNCH_INCLUDE_CATEGORIES = ["anime news", "manga news"];

// Siliconera is games-first; its own "anime" tag is the only reliable way to
// pull the anime coverage back out. EXCLUDE_KEYWORDS then drops the merch
// posts that carry the tag anyway.
const SILICONERA_INCLUDE_CATEGORY = "anime";

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
      fetchAnimeHunchNews(),
      fetchSiliconeraNews(),
      fetchToyPeopleNews(),
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

// Several of these hosts sit behind bot protection that refuses a request
// without a recognizable browser User-Agent — Anime Corner's article pages
// and Anime Hunch's feed among them.
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// That protection sometimes answers with an HTML interstitial under HTTP
// 200 rather than an error status. Parsed as a feed it yields zero items,
// which is indistinguishable from a quiet news day — so the shape of the
// body is checked here, and a blocked source returns null instead of
// silently contributing nothing.
async function fetchFeedXml(url) {
  const res = await fetch(url, { headers: { "User-Agent": BROWSER_UA } });
  if (!res.ok) return null;
  const xml = await res.text();
  return /<(?:item|entry)[\s>]/i.test(xml) ? xml : null;
}

async function fetchMalNews() {
  try {
    const xml = await fetchFeedXml(MAL_RSS_URL);
    if (!xml) return [];
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
    const xml = await fetchFeedXml(ANN_RSS_URL);
    if (!xml) return [];
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
    const xml = await fetchFeedXml(ANIME_CORNER_RSS_URL);
    if (!xml) return [];
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
    const xml = await fetchFeedXml(OTAKU_USA_RSS_URL);
    if (!xml) return [];
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

// The three sources below each cost a single subrequest: their feeds already
// carry a usable description, and roughly half the items embed their lead
// image, so unlike the ANN and Anime Corner branches they never scrape the
// article page. That keeps this endpoint well inside the per-invocation
// subrequest limit.
async function fetchAnimeHunchNews() {
  try {
    const xml = await fetchFeedXml(ANIME_HUNCH_RSS_URL);
    if (!xml) return [];
    const items = parseRssItems(xml).filter(
      (item) =>
        item.categories.some((c) => ANIME_HUNCH_INCLUDE_CATEGORIES.includes(c)) &&
        !hasExcludedKeyword(item.title)
    );

    return items.map((item) => ({
      title: item.title,
      link: item.link,
      description: stripReadMore(item.description),
      pubDate: item.pubDate,
      image: item.contentImage,
      source: "Anime Hunch",
    }));
  } catch {
    return [];
  }
}

async function fetchSiliconeraNews() {
  try {
    const xml = await fetchFeedXml(SILICONERA_RSS_URL);
    if (!xml) return [];
    const items = parseRssItems(xml).filter(
      (item) => item.categories.includes(SILICONERA_INCLUDE_CATEGORY) && !hasExcludedKeyword(item.title)
    );

    return items.map((item) => ({
      title: item.title,
      link: item.link,
      description: item.description,
      pubDate: item.pubDate,
      image: item.contentImage,
      source: "Siliconera",
    }));
  } catch {
    return [];
  }
}

async function fetchToyPeopleNews() {
  try {
    const xml = await fetchFeedXml(TOY_PEOPLE_YT_URL);
    if (!xml) return [];
    // A YouTube feed is Atom, not RSS: <entry> instead of <item>, and the
    // text lives in <media:description>. Everything needed is in the feed,
    // including a 480x360 thumbnail.
    return parseAtomEntries(xml)
      .slice(0, TOY_PEOPLE_MAX_ITEMS)
      .map((entry) => ({
        title: entry.title,
        link: entry.link,
        description: entry.description,
        pubDate: entry.published,
        image: entry.thumbnail,
        source: "Toy People",
      }));
  } catch {
    return [];
  }
}

// Anime Hunch truncates its feed description and appends a "Read more" link;
// once the markup is stripped that tail reads as part of the sentence.
function stripReadMore(text) {
  return (text || "").replace(/\s*(\.\.\.|…)?\s*Read more\s*$/i, " …").trim();
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

function parseAtomEntries(xml) {
  const entries = [];

  for (const block of xml.match(/<entry>[\s\S]*?<\/entry>/g) || []) {
    const title = extractTag(block, "title");
    // Atom puts the URL in an attribute rather than in the element body.
    const linkMatch = block.match(/<link[^>]+rel=["\']alternate["\'][^>]+href=["\']([^"\']+)["\']/);
    const thumbnailMatch = block.match(/<media:thumbnail[^>]+url=["\']([^"\']+)["\']/);

    if (title && linkMatch) {
      entries.push({
        title,
        link: linkMatch[1],
        description: extractTag(block, "media:description"),
        published: extractTag(block, "published"),
        thumbnail: thumbnailMatch ? thumbnailMatch[1] : null,
      });
    }
  }

  return entries;
}

function extractTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  if (!match) return "";
  const unwrapped = match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1");
  // Markup is stripped before entities are decoded: the other way round, an
  // escaped &lt;…&gt; in the text would turn into a tag and then be deleted
  // along with everything it appeared to wrap.
  return decodeHtmlEntities(unwrapped.replace(/<[^>]+>/g, "")).trim();
}

async function fetchOgMeta(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": BROWSER_UA } });
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

// WordPress feeds (Anime Hunch and Siliconera especially) escape apostrophes
// and ampersands as numeric entities, so a named-entity list alone leaves
// "Hitsugaya&#8217;s" in the headline — which the voice-over would then read
// out loud. &amp; is decoded last: doing it first would turn a literal
// "&amp;lt;" into a "<" that never existed in the text.
function decodeHtmlEntities(text) {
  // MyAnimeList double-escapes its apostrophes ("&amp;#039;"), so one pass
  // decodes the outer &amp; and leaves "&#039;" sitting in the headline. A
  // second pass settles it, and the cap stops a run of literal ampersands
  // from being decoded forever.
  let out = text;
  for (let pass = 0; pass < 2; pass++) {
    const next = decodeEntitiesOnce(out);
    if (next === out) break;
    out = next;
  }
  return out;
}

function decodeEntitiesOnce(text) {
  return text
    .replace(/&#(\d+);/g, (m, code) => codePointOrKeep(m, Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (m, code) => codePointOrKeep(m, parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function codePointOrKeep(original, code) {
  // An out-of-range code point would make String.fromCodePoint throw and
  // take the whole feed down with it; leaving the entity as-is is harmless.
  if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) return original;
  return String.fromCodePoint(code);
}
