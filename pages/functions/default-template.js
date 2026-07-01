import { SYSTEM_PROMPT, json, corsHeaders } from "./_utils.js";

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestGet() {
  return json({ template: SYSTEM_PROMPT });
}
