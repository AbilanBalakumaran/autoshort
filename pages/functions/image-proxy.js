import { corsHeaders } from "./_utils.js";

// Many source CDNs (MyAnimeList, Crunchyroll episode stills, article
// og:images...) serve images without CORS headers. Those images display
// fine in the grid, but refuse to load with crossOrigin="anonymous" —
// which the montage canvas requires to stay exportable — so they were
// silently dropped from the final video. The frontend retries any image
// that fails its direct CORS load through this proxy, which streams the
// same bytes back with permissive CORS.
export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestGet({ request }) {
  const target = new URL(request.url).searchParams.get("url");

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return new Response("Invalid url", { status: 400, headers: corsHeaders() });
  }

  // Only proxy plain public https images — never internal addresses.
  const host = parsed.hostname;
  const isPrivate =
    host === "localhost" ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
    host.endsWith(".local") ||
    host.endsWith(".internal");
  if (parsed.protocol !== "https:" || isPrivate) {
    return new Response("Forbidden url", { status: 400, headers: corsHeaders() });
  }

  try {
    const res = await fetch(parsed.href, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "image/*,*/*;q=0.8",
      },
    });
    if (!res.ok) {
      return new Response(`Upstream HTTP ${res.status}`, { status: 502, headers: corsHeaders() });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return new Response("Not an image", { status: 502, headers: corsHeaders() });
    }

    return new Response(res.body, {
      status: 200,
      headers: {
        ...corsHeaders(),
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    return new Response(`Proxy error: ${err.message}`, { status: 502, headers: corsHeaders() });
  }
}
