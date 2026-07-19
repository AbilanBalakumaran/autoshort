import { json, corsHeaders } from "./_utils.js";

const MAX_IMAGES = 24;
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
  const [malImages, aniListImages, kitsuImages] = await Promise.all([
    fetchRealShowImages(query),
    fetchAniListImages(query),
    fetchKitsuImages(query),
  ]);

  let images = interleave([malImages, aniListImages, kitsuImages]).slice(0, MAX_IMAGES);

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
      counts: { mal: malImages.length, aniList: aniListImages.length, kitsu: kitsuImages.length },
      errors: sourceErrors,
    };
  }
  return json(payload);
}

async function fetchRealShowImages(query) {
  try {
    const searchRes = await fetch(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`
    );
    if (!searchRes.ok) throw new Error(`Jikan HTTP ${searchRes.status}`);
    const searchData = await searchRes.json();
    const malId = searchData.data?.[0]?.mal_id;
    const mainImage = searchData.data?.[0]?.images?.jpg?.large_image_url;
    if (!malId) return [];

    const picsRes = await fetch(`https://api.jikan.moe/v4/anime/${malId}/pictures`);
    const picsData = picsRes.ok ? await picsRes.json() : { data: [] };

    const galleryUrls = (picsData.data || [])
      .map((p) => p.jpg?.large_image_url || p.jpg?.image_url)
      .filter(Boolean)
      .filter((url) => url !== mainImage);

    let urls = mainImage ? [mainImage, ...shuffle(galleryUrls)] : shuffle(galleryUrls);
    urls = [...new Set(urls)];

    // Lesser-known shows often have very few gallery pictures on MAL. Top up
    // the pool with real character portraits from the same show so there's
    // always enough variety for a montage, without falling back to AI images.
    if (urls.length < MAX_IMAGES) {
      const characterUrls = await fetchCharacterImages(malId);
      urls = [...new Set([...urls, ...shuffle(characterUrls)])];
    }

    // Still short (very obscure entry, thin gallery and cast) — pull in
    // pictures from the same franchise's other entries (sequels, movies,
    // OVAs) so we can still guarantee a real, on-topic minimum instead of
    // handing back a near-empty selection.
    if (urls.length < MIN_IMAGES) {
      const relatedUrls = await fetchRelatedShowImages(malId);
      urls = [...new Set([...urls, ...shuffle(relatedUrls)])];
    }

    return urls.slice(0, MAX_IMAGES);
  } catch (err) {
    sourceErrors.mal = err.message || String(err);
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
