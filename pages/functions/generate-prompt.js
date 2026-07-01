import { SYSTEM_PROMPT, extractVoiceScript, json, corsHeaders } from "./_utils.js";

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestPost({ request, env }) {
  const { text, template } = await request.json();

  if (!text) {
    return json({ error: "Missing 'text'" }, 400);
  }

  const systemPrompt = template && template.trim() ? template : SYSTEM_PROMPT;

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
        { role: "system", content: systemPrompt },
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
