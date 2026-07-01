import {
  SYSTEM_PROMPT,
  extractVoiceScript,
  extractVisualStyle,
  extractShowName,
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

  let videoPrompt = await callGroq(env, systemPrompt, text);
  if (videoPrompt === null) {
    return json({ error: "Groq API error" }, 502);
  }

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

  return json({ videoPrompt, voiceScript, visualStyle, showName });
}

async function callGroq(env, systemPrompt, userText) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText },
      ],
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function fixVoiceScript(env, voiceScript, minWords, maxWords) {
  const fixSystemPrompt = `You rewrite a narration sentence so it has between ${minWords} and ${maxWords} words (never fewer than ${minWords}, never more than ${maxWords}). Keep the same meaning, energetic anime-news-narrator tone, one continuous sentence. If it's too short, add natural context or color to reach the target length. Output ONLY the rewritten sentence, no quotes, no explanations.`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      messages: [
        { role: "system", content: fixSystemPrompt },
        { role: "user", content: voiceScript },
      ],
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const rewritten = data.choices?.[0]?.message?.content ?? "";
  return rewritten.trim().replace(/^"|"$/g, "");
}
