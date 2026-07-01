import { json, corsHeaders } from "./_utils.js";

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

const METADATA_SYSTEM_PROMPT = `You are a YouTube Shorts SEO expert for an anime/manga news channel. Given a short narration script, produce metadata for the video.

Output ONLY the following structure, filled in, with no extra commentary and no markdown code fences:

TITLES:
1. <title 1>
2. <title 2>
3. <title 3>
4. <title 4>

DESCRIPTION:
<description>

TAGS:
<tags>

Rules:
- The 4 titles must be varied in style (some long-tail/question-style, some direct/punchy), each under 100 characters, high-CTR, no clickbait lies, based only on the script's actual content.
- The description must: open with a hook question, summarize the news in 2-4 sentences based on the script, include a call-to-action question inviting comments, include a short subscribe call-to-action line with an emoji, and end with 6-10 relevant hashtags (no spaces in hashtags). Use short paragraphs and emojis naturally like a real YouTube Shorts description.
- The tags must be a single comma-separated line of 8-12 relevant SEO keywords/phrases (no hashtags, no numbering), based on the script's content (character names, show name, topic, related search terms).`;

export async function onRequestPost({ request, env }) {
  const { text } = await request.json();

  if (!text) {
    return json({ error: "Missing 'text'" }, 400);
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.8,
      messages: [
        { role: "system", content: METADATA_SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return json({ error: "Groq API error", details: errText }, 502);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";

  const titles = [...content.matchAll(/^\d+\.\s*(.+)$/gm)].map((m) => m[1].trim());
  const descriptionMatch = content.match(/DESCRIPTION:\s*([\s\S]*?)\n\s*TAGS:/);
  const tagsMatch = content.match(/TAGS:\s*([\s\S]*)$/);

  return json({
    titles,
    description: descriptionMatch ? descriptionMatch[1].trim() : "",
    tags: tagsMatch ? tagsMatch[1].trim() : "",
  });
}
