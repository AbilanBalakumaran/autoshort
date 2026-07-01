export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === "/generate-prompt" && request.method === "POST") {
      return handleGeneratePrompt(request, env);
    }

    if (url.pathname === "/generate-audio" && request.method === "POST") {
      return handleGenerateAudio(request, env);
    }

    return new Response("Not found", { status: 404, headers: corsHeaders() });
  },
};

const ELEVENLABS_VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam

const SYSTEM_PROMPT = `You convert a raw news snippet (in any language) about anime/manga into a single, ready-to-use AI video generation prompt.

You MUST output ONLY the template below, filled in, with no extra commentary, no markdown code fences, and no explanations. Keep every fixed line EXACTLY as shown. Only replace the {{...}} placeholders.

Rules for the placeholders:
- {{VOICE_SCRIPT}}: an English rewrite of the input, condensed into ONE punchy sentence, maximum 35 words, written to be read aloud fast by a narrator, in the energetic style of an anime news YouTube Shorts channel. Never exceed 35 words.
- {{VOICE_DIRECTION_EXTRA}}: 1 to 2 extra bullet lines (each starting with "* ") that match the emotional tone of the news (e.g. "* Emotional but energetic" for sad/heartfelt news, or "* Strong opening hook" / "* Natural enthusiasm" for hype/announcement news). Pick what fits the input.
- {{VISUAL_STYLE}}: one paragraph describing the cinematic anime visual style relevant to the specific series/topic mentioned in the input.
- {{EDITING_STYLE}}: one paragraph describing the editing pacing and focus that fits the mood of the input.
- {{BACKGROUND_MUSIC}}: one paragraph describing a music style that fits the mood of the input.

Template to fill in and output verbatim (only replace {{...}}):

Create a 16-second vertical (9:16) anime-style SHORT VIDEO WITH FULL VOICE NARRATION.

IMPORTANT: This video MUST include a clear human-like voice narrator speaking the entire script. Do NOT generate a silent video.

STRICT REQUIREMENTS:

* MUST include voice narration
* Maximum 35 words
* Fast continuous speech
* Keep the video strictly under 16 seconds
* No subtitles
* No text on screen

VOICE SCRIPT (read exactly):

"{{VOICE_SCRIPT}}"

VOICE DIRECTION:

* Energetic American English narrator
* Fast-paced but clear delivery
* Engaging anime news YouTube Shorts style
* High-retention voice
{{VOICE_DIRECTION_EXTRA}}
* No slow pacing
* No robotic delivery
* No dramatic pauses

VISUAL STYLE:
{{VISUAL_STYLE}}

EDITING STYLE:
{{EDITING_STYLE}}

AUDIO MIX:
Narrator voice must be significantly louder than background music.

BACKGROUND MUSIC:
{{BACKGROUND_MUSIC}}

FINAL RULE:
The narrator must speak continuously from the first word to the last word with no silence, no gaps, and no interruptions.`;

async function handleGeneratePrompt(request, env) {
  const { text } = await request.json();

  if (!text) {
    return json({ error: "Missing 'text'" }, 400);
  }

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
    }),
  });

  if (!groqRes.ok) {
    const errText = await groqRes.text();
    return json({ error: "Groq API error", details: errText }, 502);
  }

  const data = await groqRes.json();
  const videoPrompt = data.choices?.[0]?.message?.content ?? "";
  const voiceScript = extractVoiceScript(videoPrompt);

  return json({ videoPrompt, voiceScript });
}

function extractVoiceScript(videoPrompt) {
  const match = videoPrompt.match(/VOICE SCRIPT \(read exactly\):\s*"([^"]+)"/);
  return match ? match[1] : "";
}

async function handleGenerateAudio(request, env) {
  const { text } = await request.json();

  if (!text) {
    return json({ error: "Missing 'text'" }, 400);
  }

  const elevenRes = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": env.VITE_ELEVENLABS_API_KEY,
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

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
