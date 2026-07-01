import { json, corsHeaders } from "./_utils.js";

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestPost({ request }) {
  const { prompt, showName, characters } = await request.json();

  if (!prompt) {
    return json({ error: "Missing 'prompt'" }, 400);
  }

  const show = showName && showName.toLowerCase() !== "anime" ? showName.trim() : "";
  const characterNames = Array.isArray(characters) ? characters.slice(0, 3) : [];

  const characterImages = (
    await Promise.all(characterNames.map(fetchCharacterImage))
  ).filter(Boolean);

  let showImages = show ? await fetchRealShowImages(show) : [];
  if (showImages.length === 0) {
    showImages = await fetchRealShowImages(prompt);
  }

  const images = [...new Set([...characterImages, ...showImages])].slice(0, 4);

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

async function fetchCharacterImage(name) {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/characters?q=${encodeURIComponent(name)}&limit=1`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.images?.jpg?.image_url || null;
  } catch {
    return null;
  }
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

    return [...new Set(urls)].slice(0, 4);
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
