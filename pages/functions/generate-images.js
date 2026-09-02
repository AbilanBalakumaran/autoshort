import { json, corsHeaders } from "./_utils.js";

const MAX_IMAGES = 30;
const MIN_IMAGES = 8;
// Long enough for a headline, short enough that a pasted article body can't
// turn into a search query.
const MAX_TOPIC_CHARS = 140;

// Free-text web search returns page URLs alongside real images — Instagram's
// SEO shim (lookaside.instagram.com/seo/google_widget/crawler/?media_id=…)
// answers 200 with half a megabyte of HTML, and three of five results for a
// news headline were that. An extension in the path is what separates a file
// from an endpoint. Applied only to the web sources: the catalogue CDNs are
// known-good and some of their URLs legitimately carry none.
const IMAGE_FILE_URL = /\.(?:jpe?g|png|webp|gif|avif)(?:$|[?#])/i;

function looksLikeImageFile(url) {
  try {
    return IMAGE_FILE_URL.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

// Per-source failure notes for the current invocation — surfaced via the
// `debug` request flag so a source silently dropping out (blocked UA, rate
// limit, outage) can be diagnosed in production without redeploying.
let sourceErrors = {};

export async function onRequestPost({ request, env }) {
  const { prompt, showName, topic, debug, page: rawPage } = await request.json();
  const page = Math.max(1, Math.min(10, Number(rawPage) || 1));
  sourceErrors = {};

  if (!prompt) {
    return json({ error: "Missing 'prompt'" }, 400);
  }

  const show = showName && showName.toLowerCase() !== "anime" ? showName.trim() : "";
  const query = show || prompt;

  // The catalogue APIs below (MAL, AniList, Kitsu, TMDB) can only match a
  // franchise entry, so they keep the show name. Free-text web search can
  // answer the actual story — "Pokémon Legends Z-A trailer" rather than
  // "Pokémon" — so it gets the news headline instead. Sending the headline to
  // everything would return nothing from the catalogues; sending the show name
  // to everything is what made a trailer story come back as generic franchise
  // posters. The show name is prepended when the headline omits it, so a
  // "Nouveau trailer dévoilé" still lands on the right series.
  const headline = typeof topic === "string" ? topic.trim().slice(0, MAX_TOPIC_CHARS) : "";
  const webQuery = !headline
    ? query
    : show && !headline.toLowerCase().includes(show.toLowerCase())
      ? `${show} ${headline}`
      : headline;

  // Query all three independent anime databases in parallel and merge —
  // the goal is a rich pool of on-topic images so the user never has to
  // leave the app to hunt for pictures themselves. Each source covers the
  // others' gaps (MAL has deep galleries, AniList catches alternate
  // romanizations/very recent releases, Kitsu adds distinct poster art).
  // Manga variants included because plenty of covered news is about
  // announced adaptations that aren't in the anime databases yet — the
  // source manga's volume covers and character art already are.
  // Google image search is added on top when credentials are configured: it
  // finds exactly what the user would find by googling the show's name —
  // key visuals and news art carrying the title — which the structured
  // databases don't always have. Skipped silently when not set up.
  const [malImages, aniListImages, kitsuImages, malMangaImages, googleImages, tmdbImages, tavilyImages, wallpaperImages] =
    await Promise.all([
      fetchRealShowImages(query, page),
      fetchAniListImages(query),
      fetchKitsuImages(query, page),
      fetchMalMangaImages(query, page),
      fetchGoogleImages(webQuery, page, env, Boolean(headline)),
      fetchTmdbImages(query, page, env),
      fetchTavilyImages(webQuery, page, env, headline ? TAVILY_TOPIC_ANGLES : TAVILY_ANGLES),
      fetchTavilyImages(query, page, env, TAVILY_WALLPAPER_ANGLES),
    ]);

  // Title-bearing promotional art leads the grid.
  let images = interleave([
    tavilyImages,
    wallpaperImages,
    googleImages,
    tmdbImages,
    malImages,
    aniListImages,
    kitsuImages,
    malMangaImages,
  ]).slice(0, MAX_IMAGES);

  // Still short and the show-specific search may have missed (very obscure
  // entry) — retry the whole prompt text as a broader search.
  if (images.length < MIN_IMAGES && show && prompt !== show) {
    const promptImages = await fetchRealShowImages(prompt, page);
    images = [...new Set([...images, ...promptImages])].slice(0, MAX_IMAGES);
  }

  if (images.length === 0) {
    return json(
      {
        error: "Aucune image trouvée",
        details: "Impossible de reconnaître la série. Essaie avec un texte qui mentionne clairement le nom exact de l'anime, ou uploade tes propres images.",
      },
      404
    );
  }

  const payload = { images, source: "web" };
  if (debug) {
    payload.debug = {
      counts: {
        tavily: tavilyImages.length,
        tavilyWallpaper: wallpaperImages.length,
        tmdb: tmdbImages.length,
        google: googleImages.length,
        mal: malImages.length,
        aniList: aniListImages.length,
        kitsu: kitsuImages.length,
        malManga: malMangaImages.length,
      },
      queries: { catalogues: query, web: webQuery },
      configured: {
        tavily: Boolean(env?.TAVILY_API_KEY),
        tmdb: Boolean(env?.TMDB_API_KEY),
        google: Boolean(env?.GOOGLE_CSE_KEY && env?.GOOGLE_CSE_CX),
      },
      errors: sourceErrors,
    };
  }
  return json(payload);
}

async function fetchRealShowImages(query, page = 1) {
  try {
    // Top 3 matches, not 1: for lesser-known titles the entry's own gallery
    // is often near-empty, but its other seasons/movies rank right behind
    // it in search and carry the same franchise's art. `page` walks further
    // down the search results on each regeneration.
    const searchRes = await fetch(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=3&page=${page}`
    );
    if (!searchRes.ok) throw new Error(`Jikan HTTP ${searchRes.status}`);
    const searchData = await searchRes.json();
    const entries = searchData.data || [];
    const mainId = entries[0]?.mal_id;
    if (!mainId) return [];

    const posterUrls = entries.map((e) => e.images?.jpg?.large_image_url).filter(Boolean);

    const [mainPics, characterUrls, trailerUrls] = await Promise.all([
      fetchPictures(mainId),
      fetchCharacterImages(mainId),
      fetchTrailerImages(mainId),
    ]);

    let urls = [
      ...new Set([
        posterUrls[0],
        ...shuffle(mainPics),
        ...posterUrls.slice(1),
        ...shuffle(characterUrls),
        ...trailerUrls,
      ]),
    ].filter(Boolean);

    // Still short (thin gallery AND thin cast — typical obscure entry):
    // pull the other search matches' galleries too.
    if (urls.length < MAX_IMAGES && entries.length > 1) {
      const otherPics = await Promise.all(entries.slice(1).map((e) => fetchPictures(e.mal_id)));
      urls = [...new Set([...urls, ...otherPics.flat()])];
    }

    // Last resort — the franchise's explicitly related entries (sequels,
    // movies, OVAs) so we can still guarantee a real, on-topic minimum.
    if (urls.length < MIN_IMAGES) {
      const relatedUrls = await fetchRelatedShowImages(mainId);
      urls = [...new Set([...urls, ...shuffle(relatedUrls)])];
    }

    return urls.slice(0, MAX_IMAGES);
  } catch (err) {
    sourceErrors.mal = err.message || String(err);
    return [];
  }
}

async function fetchPictures(malId) {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}/pictures`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || [])
      .map((p) => p.jpg?.large_image_url || p.jpg?.image_url)
      .filter(Boolean);
  } catch {
    return [];
  }
}

// News is often about a manga whose anime adaptation was just announced —
// no anime entry exists anywhere yet, but the manga's volume covers and
// character portraits do.
async function fetchMalMangaImages(query, page = 1) {
  try {
    const searchRes = await fetch(
      `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(query)}&limit=2&page=${page}`
    );
    if (!searchRes.ok) throw new Error(`Jikan manga HTTP ${searchRes.status}`);
    const searchData = await searchRes.json();
    const entries = searchData.data || [];
    const mainId = entries[0]?.mal_id;
    if (!mainId) return [];

    const posterUrls = entries.map((e) => e.images?.jpg?.large_image_url).filter(Boolean);

    const [pics, characters] = await Promise.all([
      fetch(`https://api.jikan.moe/v4/manga/${mainId}/pictures`)
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .catch(() => ({ data: [] })),
      fetch(`https://api.jikan.moe/v4/manga/${mainId}/characters`)
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .catch(() => ({ data: [] })),
    ]);

    const picUrls = (pics.data || [])
      .map((p) => p.jpg?.large_image_url || p.jpg?.image_url)
      .filter(Boolean);
    const characterUrls = (characters.data || [])
      .map((c) => c.character?.images?.jpg?.image_url)
      .filter(Boolean);

    return [...new Set([...posterUrls, ...shuffle(picUrls), ...shuffle(characterUrls)])].slice(
      0,
      MAX_IMAGES
    );
  } catch (err) {
    sourceErrors.malManga = err.message || String(err);
    return [];
  }
}

// Promo/trailer thumbnails (YouTube stills) — usually a handful of real
// scene shots even for shows whose poster gallery is empty.
async function fetchTrailerImages(malId) {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}/videos`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data?.promo || [])
      .map((p) => p.trailer?.images?.maximum_image_url || p.trailer?.images?.large_image_url)
      .filter(Boolean)
      .slice(0, 5);
  } catch {
    return [];
  }
}

async function fetchCharacterImages(malId) {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}/characters`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || [])
      .map((c) => c.character?.images?.jpg?.image_url)
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchRelatedShowImages(malId) {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}/relations`);
    if (!res.ok) return [];
    const data = await res.json();
    const relatedIds = (data.data || [])
      .flatMap((rel) => rel.entry || [])
      .filter((e) => e.type === "anime")
      .map((e) => e.mal_id)
      .slice(0, 4);

    const images = [];
    for (const id of relatedIds) {
      const picsRes = await fetch(`https://api.jikan.moe/v4/anime/${id}/pictures`);
      if (!picsRes.ok) continue;
      const picsData = await picsRes.json();
      images.push(
        ...(picsData.data || []).map((p) => p.jpg?.large_image_url || p.jpg?.image_url).filter(Boolean)
      );
      if (images.length >= MIN_IMAGES) break;
    }
    return images;
  } catch {
    return [];
  }
}

// Tavily is a web search built for AI agents; with include_images it returns
// the pictures found on the pages it matched — i.e. roughly what a manual
// Google search would surface, including news-site key visuals. Free tier is
// 1000 credits/month with no card. Skipped silently when unconfigured.
//
// It has no page parameter, so each regeneration varies the wording instead;
// that genuinely changes the result set rather than re-returning the same
// images with a different offset.
const TAVILY_ANGLES = [
  "anime key visual official",
  "anime poster official art",
  "anime promotional artwork",
  "anime scene screenshot",
  "anime characters art",
];

// When the query already names the event, steering it back towards "official
// poster art" fights it — these angles keep it on the news itself.
const TAVILY_TOPIC_ANGLES = [
  "anime news",
  "anime screenshot",
  "anime key visual",
  "anime trailer",
  "anime official art",
];

// The montage is 9:16: a portrait image fills the frame, a landscape one gets
// letterboxed over a blurred copy of itself. So a second pass hunts explicitly
// for vertical wallpapers of the series — the general-artwork fallback when the
// news itself has no tall image to offer.
const TAVILY_WALLPAPER_ANGLES = [
  "phone wallpaper portrait vertical",
  "mobile wallpaper 9:16",
  "vertical wallpaper 4k",
];

async function fetchTavilyImages(query, page, env, angles) {
  const key = env?.TAVILY_API_KEY;
  if (!key || !query) return [];

  try {
    const angle = angles[(page - 1) % angles.length];
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        query: `${query} ${angle}`,
        include_images: true,
        include_answer: false,
        search_depth: "basic",
        // Images are harvested from the pages this returns, and the
        // non-image results are now filtered out, so a wider net is what
        // keeps enough on-topic pictures to fill the top of the grid.
        max_results: 15,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        res.status === 401 ? "clé Tavily refusée" : `Tavily HTTP ${res.status} ${body.slice(0, 80)}`
      );
    }

    const data = await res.json();
    // `images` is either a list of URLs or of { url, description } objects
    // depending on the options used — handle both.
    return (data.images || [])
      .map((img) => (typeof img === "string" ? img : img?.url))
      .filter((u) => typeof u === "string" && /^https:\/\//.test(u) && looksLikeImageFile(u));
  } catch (err) {
    sourceErrors.tavily = err.message || String(err);
    return [];
  }
}

// TMDB carries the official promotional artwork for anime series and films —
// posters and wide backdrops, the pieces that actually carry the show's
// title/logo. Free API key, open to anyone, no card, and its CDN allows
// hotlinking, unlike most search-engine results. Skipped when unconfigured.
async function fetchTmdbImages(query, page, env) {
  const key = env?.TMDB_API_KEY;
  if (!key || !query) return [];

  try {
    const search = async (kind) => {
      const res = await fetch(
        `https://api.themoviedb.org/3/search/${kind}?api_key=${key}&query=${encodeURIComponent(query)}`
      );
      if (!res.ok) throw new Error(`TMDB HTTP ${res.status}`);
      const data = await res.json();
      return (data.results || []).slice(0, 2).map((r) => ({ kind, id: r.id }));
    };

    const hits = [...(await search("tv")), ...(await search("movie"))];
    if (hits.length === 0) return [];

    const perEntry = await Promise.all(
      hits.map(async ({ kind, id }) => {
        try {
          const res = await fetch(`https://api.themoviedb.org/3/${kind}/${id}/images?api_key=${key}`);
          if (!res.ok) return [];
          const data = await res.json();
          // Backdrops are the wide key visuals; posters carry the title.
          const files = [
            ...(data.posters || []).map((p) => p.file_path),
            ...(data.backdrops || []).map((b) => b.file_path),
          ].filter(Boolean);
          return files.map((f) => `https://image.tmdb.org/t/p/original${f}`);
        } catch {
          return [];
        }
      })
    );

    // Page through the flattened result rather than re-querying TMDB.
    const all = [...new Set(perEntry.flat())];
    const size = 12;
    return all.slice((page - 1) * size, page * size);
  } catch (err) {
    sourceErrors.tmdb = err.message || String(err);
    return [];
  }
}

// Real Google image search, which is what the user would do by hand. The
// free tier allows 100 queries a day, so one request per page is fetched
// (10 images each) rather than paging aggressively. Both credentials live
// as Cloudflare secrets; without them this source is simply skipped.
// NOTE: Google closed this API to new customers in 2025 and shuts it down
// entirely on 2027-01-01, so it only helps accounts that already had a key.
async function fetchGoogleImages(query, page, env, isTopic = false) {
  const key = env?.GOOGLE_CSE_KEY;
  const cx = env?.GOOGLE_CSE_CX;
  if (!key || !cx || !query) return [];

  try {
    // A bare title pulls in merchandise and fan edits, so it gets biased
    // towards official art; a headline is already specific and only needs
    // steering back to anime.
    const q = isTopic ? `${query} anime` : `${query} anime key visual poster`;
    const start = (page - 1) * 10 + 1;
    if (start > 91) return []; // Google refuses start > 91

    const url =
      `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}` +
      `&q=${encodeURIComponent(q)}&searchType=image&num=10&start=${start}` +
      `&safe=active&imgSize=large`;

    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      // Quota exhaustion is the common case and shouldn't look like a bug.
      throw new Error(
        res.status === 429 || body.includes("quotaExceeded")
          ? "quota Google épuisé pour aujourd'hui"
          : `Google HTTP ${res.status}`
      );
    }

    const data = await res.json();
    return (data.items || [])
      .map((item) => item.link)
      .filter((link) => typeof link === "string" && /^https:\/\//.test(link));
  } catch (err) {
    sourceErrors.google = err.message || String(err);
    return [];
  }
}

// Independent of MAL/Jikan — AniList has its own search index and often
// recognizes titles Jikan misses (alternate romanizations, very recent
// releases). No API key required.
async function fetchAniListImages(query) {
  if (!query) return [];
  try {
    // Top 2 matches (not just 1): sequels/seasons are separate AniList
    // entries of the same franchise, so the runner-up usually adds more
    // on-topic art rather than noise.
    const gqlQuery = `
      query ($search: String) {
        Page(perPage: 2) {
          media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
            coverImage { extraLarge large }
            bannerImage
            characters(sort: ROLE, perPage: 12) {
              nodes { image { large } }
            }
          }
        }
      }
    `;

    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        // Same story as Anime Corner in news.js: some services reject
        // requests without a recognizable browser User-Agent.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({ query: gqlQuery, variables: { search: query } }),
    });
    if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
    const data = await res.json();
    const mediaList = data.data?.Page?.media || [];

    const urls = mediaList.flatMap((media) => [
      media.coverImage?.extraLarge || media.coverImage?.large,
      media.bannerImage,
      ...(media.characters?.nodes || []).map((n) => n.image?.large),
    ]);

    return [...new Set(urls.filter(Boolean))];
  } catch (err) {
    sourceErrors.aniList = err.message || String(err);
    return [];
  }
}

// Third independent database — Kitsu's poster/cover art is largely distinct
// from MAL's and AniList's, so it widens the pool rather than duplicating it.
async function fetchKitsuImages(query, page = 1) {
  if (!query) return [];
  try {
    const res = await fetch(
      `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(query)}&page[limit]=3`,
      { headers: { Accept: "application/vnd.api+json" } }
    );
    if (!res.ok) return [];
    const data = await res.json();

    const urls = (data.data || []).flatMap((entry) => [
      entry.attributes?.posterImage?.original || entry.attributes?.posterImage?.large,
      entry.attributes?.coverImage?.original || entry.attributes?.coverImage?.large,
    ]);

    // Episode thumbnails of the best match — every aired episode has its
    // own scene still, which makes this the highest-volume source for
    // lesser-known shows whose poster galleries are nearly empty. The
    // offset slides with `page` (episodes 21-40 on page 2, and so on) so
    // regenerations keep surfacing new stills of the SAME show instead of
    // drifting to unrelated search matches.
    const firstId = data.data?.[0]?.id;
    if (firstId) {
      const epRes = await fetch(
        `https://kitsu.io/api/edge/anime/${firstId}/episodes?page[limit]=20&page[offset]=${(page - 1) * 20}`,
        { headers: { Accept: "application/vnd.api+json" } }
      );
      if (epRes.ok) {
        const epData = await epRes.json();
        urls.push(
          ...(epData.data || [])
            .map((ep) => ep.attributes?.thumbnail?.original)
            .filter(Boolean)
        );
      }
    }

    // Same not-yet-adapted scenario as the other sources: Kitsu's manga
    // catalog has the volume covers even when no anime entry exists.
    const mangaRes = await fetch(
      `https://kitsu.io/api/edge/manga?filter[text]=${encodeURIComponent(query)}&page[limit]=2`,
      { headers: { Accept: "application/vnd.api+json" } }
    );
    if (mangaRes.ok) {
      const mangaData = await mangaRes.json();
      urls.push(
        ...(mangaData.data || []).flatMap((entry) => [
          entry.attributes?.posterImage?.original || entry.attributes?.posterImage?.large,
          entry.attributes?.coverImage?.original || entry.attributes?.coverImage?.large,
        ])
      );
    }

    return [...new Set(urls.filter(Boolean))];
  } catch {
    return [];
  }
}

// Round-robin merge so every source is represented near the top of the
// grid, instead of one source's full batch pushing the others below the
// MAX_IMAGES cutoff.
function interleave(lists) {
  const merged = [];
  const longest = Math.max(...lists.map((l) => l.length), 0);
  for (let i = 0; i < longest; i++) {
    for (const list of lists) {
      if (i < list.length) merged.push(list[i]);
    }
  }
  return [...new Set(merged)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
