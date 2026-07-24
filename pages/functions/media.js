import { json, corsHeaders } from "./_utils.js";

// Buffer schedules a video by URL, not by upload — it fetches the file itself
// at publish time. The video only exists as a Blob in the browser, so it gets
// parked here first: POST stores it in KV under a random id with a TTL, and
// the returned public GET URL is what goes into the Buffer post. Entries
// self-delete after MEDIA_TTL_SECONDS so this never becomes a file dump.
const MEDIA_PREFIX = "media:";
const MEDIA_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days — well past any scheduled slot
const MAX_BYTES = 24 * 1024 * 1024; // KV's per-value ceiling is 25 MiB

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestPost({ request, env }) {
  if (!env.PUSH_KV) return json({ error: "Stockage média non configuré" }, 500);

  const contentType = request.headers.get("content-type") || "application/octet-stream";
  if (!contentType.startsWith("video/") && !contentType.startsWith("image/")) {
    return json({ error: "Type de fichier non supporté" }, 400);
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length === 0) return json({ error: "Fichier vide" }, 400);
  if (bytes.length > MAX_BYTES) {
    return json(
      {
        error: "Vidéo trop lourde pour la programmation automatique",
        details: `${Math.round(bytes.length / 1024 / 1024)} Mo — la limite est de 24 Mo.`,
      },
      413
    );
  }

  const id = crypto.randomUUID().replace(/-/g, "");
  await env.PUSH_KV.put(MEDIA_PREFIX + id, bytes, {
    expirationTtl: MEDIA_TTL_SECONDS,
    metadata: { contentType },
  });

  const url = new URL(request.url);
  return json({ url: `${url.origin}/media?id=${id}`, id, expiresInDays: MEDIA_TTL_SECONDS / 86400 });
}

export async function onRequestGet({ request, env }) {
  if (!env.PUSH_KV) return new Response("Not configured", { status: 500 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^[a-f0-9]{32}$/.test(id)) return new Response("Not found", { status: 404 });

  const { value, metadata } = await env.PUSH_KV.getWithMetadata(MEDIA_PREFIX + id, {
    type: "arrayBuffer",
  });
  if (!value) return new Response("Not found", { status: 404 });

  return new Response(value, {
    headers: {
      ...corsHeaders(),
      "Content-Type": metadata?.contentType || "video/mp4",
      "Content-Length": String(value.byteLength),
      // Buffer may fetch this more than once (validation, then publish).
      "Cache-Control": "public, max-age=3600",
      "Accept-Ranges": "bytes",
    },
  });
}
