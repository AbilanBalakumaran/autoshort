import {
  GROQ_MODEL,
  SYSTEM_PROMPT,
  extractVoiceScript,
  extractVisualStyle,
  extractShowName,
  extractCharacters,
  extractRealEntities,
  replaceVoiceScript,
  applyDuration,
  wordRangeForDuration,
  countWords,
  json,
  corsHeaders,
} from "./_utils.js";

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestPost({ request, env }) {
  const { text, template, duration } = await request.json();

  if (!text) {
    return json({ error: "Missing 'text'" }, 400);
  }

  const rawTemplate = template && template.trim() ? template : SYSTEM_PROMPT;
  const systemPrompt = applyDuration(rawTemplate, duration);
  const { minWords, maxWords } = wordRangeForDuration(duration);

  const first = await callGroq(env, systemPrompt, text);
  if (first.error) {
    return json({ error: "Groq API error", details: first.error }, 502);
  }
  let videoPrompt = first.content;

  let voiceScript = extractVoiceScript(videoPrompt);

  for (let attempt = 0; attempt < 2; attempt++) {
    const count = countWords(voiceScript);
    if (!voiceScript || count >= minWords && count <= maxWords) break;

    const fixed = await fixVoiceScript(env, voiceScript, minWords, maxWords);
    if (!fixed) break;

    voiceScript = fixed;
    videoPrompt = replaceVoiceScript(videoPrompt, voiceScript);
  }

  const visualStyle = extractVisualStyle(videoPrompt);
  const showName = extractShowName(videoPrompt);
  const characters = extractCharacters(videoPrompt);
  const realEntities = extractRealEntities(videoPrompt);

  return json({ videoPrompt, voiceScript, visualStyle, showName, characters, realEntities });
}

async function callGroq(env, systemPrompt, userText, temperature = 0.7) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText },
      ],
    }),
  });

  // Return the reason, not just a null: a retired model and a bad key look
  // identical from the outside otherwise.
  if (!res.ok) {
    return { error: `HTTP ${res.status} — ${(await res.text()).slice(0, 300)}` };
  }
  const data = await res.json();
  return { content: data.choices?.[0]?.message?.content ?? "" };
}

async function fixVoiceScript(env, voiceScript, minWords, maxWords) {
  const fixSystemPrompt = `You rewrite a narration sentence so it has between ${minWords} and ${maxWords} words (never fewer than ${minWords}, never more than ${maxWords}). Keep the same meaning, energetic anime-news-narrator tone, one continuous sentence with natural comma pauses at clause breaks and a final period (needed for correct text-to-speech pacing and subtitle timing). If it's too short, add natural context or color to reach the target length. Output ONLY the rewritten sentence, no quotes, no explanations.`;

  const { content } = await callGroq(env, fixSystemPrompt, voiceScript, 0.5);
  if (!content) return null;
  return content.trim().replace(/^"|"$/g, "");
}
