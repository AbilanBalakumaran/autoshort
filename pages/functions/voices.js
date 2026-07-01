import { json, corsHeaders } from "./_utils.js";

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestGet({ env }) {
  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": env.ELEVENLABS_API_KEY },
  });

  if (!res.ok) {
    const errText = await res.text();
    return json({ error: "ElevenLabs API error", details: errText }, 502);
  }

  const data = await res.json();
  const voices = (data.voices || []).map((v) => ({
    voice_id: v.voice_id,
    name: v.name,
    preview_url: v.preview_url,
    category: v.category,
  }));

  return json({ voices });
}
