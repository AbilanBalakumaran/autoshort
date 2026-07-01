import { json, corsHeaders } from "./_utils.js";

const MAX_IMAGES = 8;

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

  if (images.length === 0) {
    images = await fetchRealShowImages(prompt);
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

    const shuffledGallery = shuffle(galleryUrls);
    const urls = mainImage ? [mainImage, ...shuffledGallery] : shuffledGallery;

    return [...new Set(urls)].slice(0, MAX_IMAGES);
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
