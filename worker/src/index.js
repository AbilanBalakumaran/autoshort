export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === "/generate-script" && request.method === "POST") {
      return handleGenerateScript(request, env);
    }

    return new Response("Not found", { status: 404, headers: corsHeaders() });
  },
};

async function handleGenerateScript(request, env) {
  const { prompt } = await request.json();

  if (!prompt) {
    return json({ error: "Missing 'prompt'" }, 400);
  }

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "Tu es un scénariste pour des shorts anime style TikTok. Écris un script court, punchy, en 4-6 phrases.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!groqRes.ok) {
    const errText = await groqRes.text();
    return json({ error: "Groq API error", details: errText }, 502);
  }

  const data = await groqRes.json();
  const script = data.choices?.[0]?.message?.content ?? "";

  return json({ script });
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
