import { json, corsHeaders } from "./_utils.js";

// Buffer's GraphQL API doesn't send CORS headers, so the browser can't call
// it directly — every request is relayed through here. The user's personal
// API key travels in the request body (over HTTPS) and is only ever put in
// the Authorization header of the upstream call; it's never logged or stored
// server-side, since this Worker keeps no state.
const BUFFER_GRAPHQL_URL = "https://api.buffer.com";

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestPost({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Corps de requête invalide" }, 400);
  }

  const { apiKey, query, variables } = body;
  if (!apiKey) return json({ error: "Clé API Buffer manquante" }, 400);
  if (!query) return json({ error: "Requête GraphQL manquante" }, 400);

  try {
    const res = await fetch(BUFFER_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query, variables: variables || {} }),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // Buffer answers with HTML on auth failures rather than JSON.
      return json(
        {
          error:
            res.status === 401 || res.status === 403
              ? "Clé API Buffer refusée — vérifie qu'elle est valide et active."
              : `Buffer a renvoyé une réponse inattendue (HTTP ${res.status})`,
        },
        502
      );
    }

    if (data.errors?.length) {
      return json({ error: data.errors[0]?.message || "Erreur Buffer", errors: data.errors }, 400);
    }

    return json({ data: data.data });
  } catch (err) {
    return json({ error: `Buffer injoignable : ${err.message || err}` }, 502);
  }
}
