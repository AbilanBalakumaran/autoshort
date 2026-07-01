import { json, corsHeaders } from "./_utils.js";

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestPost({ request, env }) {
  const { prompt } = await request.json();

  if (!prompt) {
    return json({ error: "Missing 'prompt'" }, 400);
  }

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
          { text: `${prompt}, anime style, cinematic, vertical composition, high detail`, weight: 1 },
          { text: "text, subtitles, watermark, blurry, low quality", weight: -1 },
        ],
        samples: 4,
        width: 768,
        height: 1344,
        cfg_scale: 7,
        steps: 30,
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    return json({ error: "Stability API error", details: errText }, 502);
  }

  const data = await res.json();
  const images = (data.artifacts || []).map((a) => `data:image/png;base64,${a.base64}`);

  return json({ images });
}
