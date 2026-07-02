import { json, corsHeaders } from "./_utils.js";

// Manual trigger for the hourly push-notification check, proxied through
// this Pages project (autoshort-2ym.pages.dev) since the push worker lives
// on workers.dev, which some networks (Cisco Umbrella/OpenDNS) block.
export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestGet() {
  const res = await fetch("https://autoshort-push-worker.mangateamz2.workers.dev/check");
  const data = await res.json();
  return json(data, res.status);
}
