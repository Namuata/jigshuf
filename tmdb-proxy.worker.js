/* ============================================================================
 *  Jigshuffle — TMDB proxy (Cloudflare Worker)
 *
 *  Keeps your TMDB API key server-side so it's never shipped to the browser.
 *  The site calls THIS worker; the worker injects the key and forwards to TMDB.
 *
 *  Deploy (no CLI needed):
 *   1. dash.cloudflare.com → Workers & Pages → Create → Worker → paste this.
 *   2. Settings → Variables → add a SECRET named  TMDB_KEY  = your TMDB v3 key.
 *   3. Deploy, copy the *.workers.dev URL, paste it into index.html (TMDB_PROXY).
 *   4. Put your GitHub Pages origin in ALLOWED_ORIGINS below and redeploy.
 *
 *  Note: regenerate your TMDB key first — the old one was already public.
 * ========================================================================== */

const ALLOWED_ORIGINS = [
  "https://YOURNAME.github.io",   // <-- your GitHub Pages origin (scheme + host, no path)
  "http://localhost:8080",        // local dev (adjust/remove as needed)
  "http://127.0.0.1:5500"
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

    // CORS preflight.
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors(allowOrigin) });
    }
    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, 405, allowOrigin);
    }

    // Block other sites' browsers from reusing the worker. (Origin can be
    // spoofed by non-browser clients, but this stops casual embedding/theft.)
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: "Forbidden origin" }, 403, allowOrigin);
    }

    // Only proxy the TMDB v3 API surface.
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/3/")) {
      return json({ error: "Not found" }, 404, allowOrigin);
    }
    if (!env.TMDB_KEY) {
      return json({ error: "Worker missing TMDB_KEY secret" }, 500, allowOrigin);
    }

    // Rebuild the upstream URL and inject the key server-side.
    const upstream = new URL("https://api.themoviedb.org" + url.pathname + url.search);
    upstream.searchParams.set("api_key", env.TMDB_KEY);

    const res = await fetch(upstream.toString(), {
      headers: { "Accept": "application/json" },
      cf: { cacheTtl: 300, cacheEverything: true }  // edge-cache 5 min
    });

    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        ...cors(allowOrigin),
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300"
      }
    });
  }
};

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}
function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json" }
  });
}
