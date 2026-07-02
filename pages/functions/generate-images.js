import { json, corsHeaders } from "./_utils.js";

const MAX_IMAGES = 8;
const MIN_IMAGES = 5;

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestPost({ request }) {
  const { prompt, showName } = await request.json();

  if (!prompt) {
    return json({ error: "Missing 'prompt'" }, 400);
  }

  const show = showName && showName.toLowerCase() !== "anime" ? showName.trim() : "";

  let images = show ? await fetchRealShowImages(show) : [];

  // If the show-specific search came up short (very obscure entry — thin
  // gallery, no cast, no related entries), also pull in whatever the
  // broader prompt search finds and merge it in, instead of only using it
  // as an either/or fallback when the show search returned nothing at all.
  if (images.length < MIN_IMAGES) {
    const promptImages = await fetchRealShowImages(prompt);
    images = [...new Set([...images, ...promptImages])].slice(0, MAX_IMAGES);
  }

  if (images.length === 0) {
    return json(
      {
        error: "Aucune image trouvée",
        details: "Impossible de reconnaître la série sur MyAnimeList. Essaie avec un texte qui mentionne clairement le nom exact de l'anime.",
      },
      404
    );
  }

  return json({ images, source: "web" });
}

async function fetchRealShowImages(query) {
  try {
    const searchRes = await fetch(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`
    );
    if (!searchRes.ok) return [];
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

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
