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
- ALL 4 titles must be long-tail and specific — never generic. A generic title names only the show ("Blue Lock News Update"); a long-tail title names the show AND the specific event/reaction/detail from the script ("Why Blue Lock's Official Account Reacted To Japan's World Cup Exit"). Vary the phrasing (a question, a "why/how" framing, a direct statement, a reaction-focused angle), each under 100 characters, high-CTR, no clickbait lies, based only on the script's actual content.
- The description must be written as SEPARATE PARAGRAPHS on their own lines, with a BLANK LINE between every paragraph/section (double line break, not single) so it reads as clearly spaced blocks, not a wall of text. Structure, each as its own paragraph separated by a blank line: (1) a hook question, (2) a 2-4 sentence summary of the news based on the script, (3) a call-to-action question inviting comments, (4) a short subscribe call-to-action line with an emoji, (5) 6-10 relevant hashtags on their own line (no spaces in hashtags). Use emojis naturally like a real YouTube Shorts description.
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
