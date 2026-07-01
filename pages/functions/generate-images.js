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

  const result = await generateAiImages(env, prompt, show);
  if (result.error) {
    return json({ error: "AI image generation error", details: result.error }, 502);
  }

  return json({ images: result.images, source: "ai" });
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
  const fullPrompt = `${showPrefix}${prompt}, anime style, cinematic, vertical composition, high detail, portrait orientation`;

  try {
    const outputs = await Promise.all(
      Array.from({ length: 4 }, () =>
        env.AI.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", {
          prompt: fullPrompt,
          width: 768,
          height: 1344,
        })
      )
    );

    const images = await Promise.all(
      outputs.map(async (output) => {
        const buffer = await new Response(output).arrayBuffer();
        return `data:image/png;base64,${arrayBufferToBase64(buffer)}`;
      })
    );

    return { images };
  } catch (err) {
    return { error: err.message || String(err) };
  }
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
