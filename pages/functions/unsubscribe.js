import { json, corsHeaders } from "./_utils.js";

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestPost({ request, env }) {
  const { endpoint } = await request.json();

  if (!endpoint) {
    return json({ error: "Missing 'endpoint'" }, 400);
  }

  const key = `sub:${await hashEndpoint(endpoint)}`;
  await env.PUSH_KV.delete(key);

  return json({ ok: true });
}

async function hashEndpoint(endpoint) {
  const data = new TextEncoder().encode(endpoint);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
