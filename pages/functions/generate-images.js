import { json, corsHeaders } from "./_utils.js";

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestPost({ request, env }) {
  const { prompt, showName } = await request.json();

  if (!prompt) {
    return json({ error: "Missing 'prompt'" }, 400);
  }

  const show = showName && showName.toLowerCase() !== "anime" ? showName.trim() : "";

  if (show) {
    const realImages = await fetchRealShowImages(show);
    if (realImages.length > 0) {
      return json({ images: realImages, source: "web" });
    }
  }

  const images = await generateAiImages(env, prompt, show);
  return json({ images, source: "ai" });
}

async function fetchRealShowImages(show) {
  try {
    const searchRes = await fetch(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(show)}&limit=1`
    );
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    const malId = searchData.data?.[0]?.mal_id;
    if (!malId) return [];

    const picsRes = await fetch(`https://api.jikan.moe/v4/anime/${malId}/pictures`);
    if (!picsRes.ok) return [];
    const picsData = await picsRes.json();

    const urls = (picsData.data || [])
      .map((p) => p.jpg?.large_image_url || p.jpg?.image_url)
      .filter(Boolean);

    return shuffle(urls).slice(0, 4);
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

async function generateAiImages(env, prompt, show) {
  const showPrefix = show ? `${show} anime, in the art style of ${show}, ` : "";

  const res = await fetch(
    "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.STABILITY_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        text_prompts: [
          { text: `${showPrefix}${prompt}, anime style, cinematic, vertical composition, high detail, portrait orientation`, weight: 1 },
          { text: "text, subtitles, watermark, blurry, low quality, landscape orientation", weight: -1 },
        ],
        samples: 4,
        width: 768,
        height: 1344,
        cfg_scale: 7,
        steps: 30,
      }),
    }
  );

  if (!res.ok) return [];

  const data = await res.json();
  return (data.artifacts || []).map((a) => `data:image/png;base64,${a.base64}`);
}
