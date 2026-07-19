import { json, corsHeaders } from "./_utils.js";

const MAX_IMAGES = 30;
const MIN_IMAGES = 8;

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

// Per-source failure notes for the current invocation — surfaced via the
// `debug` request flag so a source silently dropping out (blocked UA, rate
// limit, outage) can be diagnosed in production without redeploying.
let sourceErrors = {};

export async function onRequestPost({ request }) {
  const { prompt, showName, debug } = await request.json();
  sourceErrors = {};

  if (!prompt) {
    return json({ error: "Missing 'prompt'" }, 400);
  }

  const show = showName && showName.toLowerCase() !== "anime" ? showName.trim() : "";
  const query = show || prompt;

  // Query all three independent anime databases in parallel and merge —
  // the goal is a rich pool of on-topic images so the user never has to
  // leave the app to hunt for pictures themselves. Each source covers the
  // others' gaps (MAL has deep galleries, AniList catches alternate
  // romanizations/very recent releases, Kitsu adds distinct poster art).
  // Manga variants included because plenty of covered news is about
  // announced adaptations that aren't in the anime databases yet — the
  // source manga's volume covers and character art already are.
  const [malImages, aniListImages, kitsuImages, malMangaImages] = await Promise.all([
    fetchRealShowImages(query),
    fetchAniListImages(query),
    fetchKitsuImages(query),
    fetchMalMangaImages(query),
  ]);

  let images = interleave([malImages, aniListImages, kitsuImages, malMangaImages]).slice(0, MAX_IMAGES);

  // Still short and the show-specific search may have missed (very obscure
  // entry) — retry the whole prompt text as a broader search.
  if (images.length < MIN_IMAGES && show && prompt !== show) {
    const promptImages = await fetchRealShowImages(prompt);
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
        mal: malImages.length,
        aniList: aniListImages.length,
        kitsu: kitsuImages.length,
        malManga: malMangaImages.length,
      },
      errors: sourceErrors,
    };
  }
  return json(payload);
}

async function fetchRealShowImages(query) {
  try {
    // Top 3 matches, not 1: for lesser-known titles the entry's own gallery
    // is often near-empty, but its other seasons/movies rank right behind
    // it in search and carry the same franchise's art.
    const searchRes = await fetch(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=3`
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
async function fetchMalMangaImages(query) {
  try {
    const searchRes = await fetch(
      `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(query)}&limit=2`
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
async function fetchKitsuImages(query) {
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
    // lesser-known shows whose poster galleries are nearly empty.
    const firstId = data.data?.[0]?.id;
    if (firstId) {
      const epRes = await fetch(
        `https://kitsu.io/api/edge/anime/${firstId}/episodes?page[limit]=20`,
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
