export const ELEVENLABS_VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam

export const SYSTEM_PROMPT = `You convert a raw news snippet (in any language) about anime/manga into a single, ready-to-use AI video generation prompt.

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

export function extractVoiceScript(videoPrompt) {
  const match = videoPrompt.match(/VOICE SCRIPT \(read exactly\):\s*"([^"]+)"/);
  return match ? match[1] : "";
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
