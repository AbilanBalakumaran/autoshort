export const ELEVENLABS_VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam

// Curated list of well-known ElevenLabs premade voices, shown in Settings
// regardless of what's in the account's own voice library.
export const CURATED_VOICES = [
  { voice_id: "pNInz6obpgDQGcFmaJgB", name: "Adam", tag: "Homme · Grave" },
  { voice_id: "ErXwobaYiN019PkySvjV", name: "Antoni", tag: "Homme · Chaleureux" },
  { voice_id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", tag: "Homme · Énergique" },
  { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", tag: "Femme · Douce" },
  { voice_id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", tag: "Femme · Expressive" },
];

export const SYSTEM_PROMPT = `You convert a raw news snippet (in any language) about anime/manga into a single, ready-to-use AI video generation prompt.

You MUST output ONLY the template below, filled in, with no extra commentary, no markdown code fences, and no explanations. Keep every fixed line EXACTLY as shown. Only replace the {{...}} placeholders.

Rules for the placeholders:
- {{VOICE_SCRIPT}}: an English rewrite of the input, written to be read aloud fast by a narrator, in the energetic style of an anime news YouTube Shorts channel. Your target is EXACTLY {{TARGET_WORDS}} words — aim for that number, not fewer. It must fall between {{MIN_WORDS}} and {{MAX_WORDS}} words; a script shorter than {{MIN_WORDS}} words is WRONG and unacceptable, even if the input news is short. If the input is short, add natural context, color, or reaction to reach the target length. Before writing the template output, silently draft the sentence, count its words, and rewrite it until the count is between {{MIN_WORDS}} and {{MAX_WORDS}} — only then produce the final output. MUST include natural punctuation (commas at clause breaks, one final period) so a text-to-speech voice pauses briefly in the right places instead of reading it as one flat run-on — this is required for correct subtitle timing, not optional.

Example of correct length calibration: for a 16-second video (target ~33 words), a compliant script is: "After Japan's World Cup elimination, Blue Lock's official account honored the team, saying today's heartbreak will become tomorrow's victories in a powerful message to every player." (28 words — inside a 28-33 range for 16s). Scale this same density up or down for other durations. Notice the commas marking natural pause points — always include them.
- {{VOICE_DIRECTION_EXTRA}}: 1 to 2 extra bullet lines (each starting with "* ") that match the emotional tone of the news (e.g. "* Emotional but energetic" for sad/heartfelt news, or "* Strong opening hook" / "* Natural enthusiasm" for hype/announcement news). Pick what fits the input.
- {{VISUAL_STYLE}}: one paragraph describing the cinematic anime visual style relevant to the specific series/topic mentioned in the input.
- {{EDITING_STYLE}}: one paragraph describing the editing pacing and focus that fits the mood of the input.
- {{BACKGROUND_MUSIC}}: one paragraph describing a music style that fits the mood of the input.
- {{SHOW_NAME}}: the exact name of the specific anime/manga franchise mentioned or clearly implied by the input (e.g. "Blue Lock", "Mushoku Tensei", "One Piece"). If no specific franchise is identifiable, output "anime" instead.
- {{CHARACTERS}}: a comma-separated list of specific FICTIONAL anime/manga character names explicitly mentioned in the input (e.g. "Isagi, Bachira"). If none are mentioned, output "none".
- {{REAL_ENTITIES}}: a comma-separated list of REAL-WORLD named entities explicitly mentioned in the input — this includes manga/anime authors or artists, sports teams (e.g. "Japan national football team"), athletes, or celebrities. Use their most common/searchable name (e.g. "Muneyuki Kaneshiro", "Japan national football team"). If none are mentioned, output "none".

Template to fill in and output verbatim (only replace {{...}}):

Create a {{DURATION}}-second vertical (9:16) anime-style SHORT VIDEO WITH FULL VOICE NARRATION.

IMPORTANT: This video MUST include a clear human-like voice narrator speaking the entire script. Do NOT generate a silent video.

STRICT REQUIREMENTS:

* MUST include voice narration
* Target {{TARGET_WORDS}} words (must be between {{MIN_WORDS}} and {{MAX_WORDS}}, never fewer than {{MIN_WORDS}})
* Fast continuous speech
* Keep the video strictly under {{DURATION}} seconds
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
The narrator must speak continuously from the first word to the last word with no silence, no gaps, and no interruptions.

SHOW: {{SHOW_NAME}}
CHARACTERS: {{CHARACTERS}}
REAL_ENTITIES: {{REAL_ENTITIES}}`;

export function extractVoiceScript(videoPrompt) {
  const match = videoPrompt.match(/VOICE SCRIPT \(read exactly\):\s*"([^"]+)"/);
  return match ? match[1] : "";
}

export function extractVisualStyle(videoPrompt) {
  const match = videoPrompt.match(/VISUAL STYLE:\s*([\s\S]*?)\n\n/);
  return match ? match[1].trim() : "";
}

export function extractShowName(videoPrompt) {
  const match = videoPrompt.match(/SHOW:\s*(.+)/);
  return match ? match[1].trim() : "";
}

export function extractCharacters(videoPrompt) {
  return extractCommaList(videoPrompt, /CHARACTERS:\s*(.+)/);
}

export function extractRealEntities(videoPrompt) {
  return extractCommaList(videoPrompt, /REAL_ENTITIES:\s*(.+)/);
}

function extractCommaList(videoPrompt, pattern) {
  const match = videoPrompt.match(pattern);
  if (!match) return [];
  const raw = match[1].trim();
  if (!raw || raw.toLowerCase() === "none") return [];
  return raw
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

export function replaceVoiceScript(videoPrompt, newVoiceScript) {
  return videoPrompt.replace(
    /(VOICE SCRIPT \(read exactly\):\s*")[^"]+(")/,
    `$1${newVoiceScript}$2`
  );
}

export function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const DEFAULT_DURATION = 16;
const WORDS_PER_SECOND = 35 / 16; // matches the original 16s / 35-word pacing

export function wordsForDuration(duration) {
  return Math.max(1, Math.round(duration * WORDS_PER_SECOND));
}

export function wordRangeForDuration(duration) {
  const seconds = Number(duration) > 0 ? Number(duration) : DEFAULT_DURATION;
  const maxWords = wordsForDuration(seconds);
  const minWords = Math.max(1, maxWords - 5);
  const targetWords = Math.max(minWords, maxWords - 2);
  return { seconds, minWords, maxWords, targetWords };
}

export function applyDuration(template, duration) {
  const { seconds, minWords, maxWords, targetWords } = wordRangeForDuration(duration);
  return template
    .replaceAll("{{DURATION}}", String(seconds))
    .replaceAll("{{MAX_WORDS}}", String(maxWords))
    .replaceAll("{{MIN_WORDS}}", String(minWords))
    .replaceAll("{{TARGET_WORDS}}", String(targetWords));
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
