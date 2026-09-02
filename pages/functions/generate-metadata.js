import { GROQ_MODEL, json, corsHeaders } from "./_utils.js";

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
      model: GROQ_MODEL,
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
    tags: cleanTags(tagsMatch ? tagsMatch[1] : ""),
  });
}

// YouTube allows 500 characters of tags in total and 100 per tag, and counts
// the separators. Past the limit it drops the overflow silently.
const YOUTUBE_TAGS_MAX_CHARS = 500;
const YOUTUBE_TAG_MAX_CHARS = 100;

// The TAGS capture above runs to the end of the model's message, so anything
// it adds after the list — a closing remark, a repeated heading — used to land
// in the field and be pasted into YouTube as tags. Only the first block is
// kept, and each entry is normalised to what the tag field accepts: no
// hashtag, no quotes, no list bullet, no duplicate, nothing over the limits.
function cleanTags(raw) {
  const firstBlock = String(raw || "").split(/\n\s*\n/)[0];
  const seen = new Set();
  const tags = [];
  let total = 0;

  for (const piece of firstBlock.split(/[,\n]/)) {
    const tag = piece
      // Trimmed first: the separators leave a leading space, which would stop
      // the anchored patterns below from matching at all.
      .trim()
      .replace(/^(?:\d+[.)]|[-*\u2022])\s+/, "")
      .replace(/^#+/, "")
      .replace(/["\u201c\u201d\u2018\u2019']/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!tag || tag.length > YOUTUBE_TAG_MAX_CHARS) continue;

    const key = tag.toLowerCase();
    if (seen.has(key)) continue;

    // ", " between entries counts towards YouTube's budget too.
    const cost = tag.length + (tags.length ? 2 : 0);
    if (total + cost > YOUTUBE_TAGS_MAX_CHARS) break;

    seen.add(key);
    tags.push(tag);
    total += cost;
  }

  return tags.join(", ");
}
