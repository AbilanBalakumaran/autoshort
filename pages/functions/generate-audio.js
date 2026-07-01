import { ELEVENLABS_VOICE_ID, json, corsHeaders } from "./_utils.js";

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestPost({ request, env }) {
  const { text, voiceId } = await request.json();

  if (!text) {
    return json({ error: "Missing 'text'" }, 400);
  }

  const elevenRes = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId || ELEVENLABS_VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.4, similarity_boost: 0.8 },
      }),
    }
  );

  if (!elevenRes.ok) {
    const errText = await elevenRes.text();
    return json({ error: "ElevenLabs API error", details: errText }, 502);
  }

  return new Response(elevenRes.body, {
    status: 200,
    headers: { "Content-Type": "audio/mpeg", ...corsHeaders() },
  });
}
