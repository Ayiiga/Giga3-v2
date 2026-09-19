/**
 * Lightweight health probe for offline.html and connectivity checks.
 * Cloudflare Pages: served at /api/health
 *
 * Nginx equivalent (if ever proxied):
 *   proxy_read_timeout 120s;
 *   proxy_connect_timeout 15s;
 *   keepalive_timeout 65s;
 */
export async function onRequest() {
  return Response.json(
    { status: "ok", uptime: 0, ts: Date.now() },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Content-Type": "application/json",
      },
    }
  );
}
