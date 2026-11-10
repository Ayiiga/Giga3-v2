import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("service worker cache version", () => {
  it("uses current cache generation with offline.html fallback", () => {
    const sw = readFileSync(resolve(__dirname, "../../web/public/sw.js"), "utf8");
    expect(sw).toContain('CACHE_VERSION = "giga3-v');
    expect(sw).toContain('OFFLINE_URL = "/offline.html"');
    expect(sw).toContain("requireInteraction: true");
    expect(sw).toContain("NETWORK_TIMEOUT_MS");
    expect(sw).toContain("fetchWithTimeout");
    expect(sw).toContain("handleStaleChunk");
    expect(sw).toContain('"/api/"');
    expect(sw).toContain('if (request.mode === "navigate")');
    expect(sw).toContain("offlineDocumentResponse(offline)");
    expect(sw).toContain('"Content-Type": "text/html; charset=utf-8"');
    expect(sw).toContain("return jsonOffline();");
    // Activate retires prior Giga3 generations only (never blanket-delete third-party caches).
    expect(sw).toContain('k.startsWith("giga3-") && k !== CACHE_VERSION');
  });

  it("network-first navigation with offline.html fallback", () => {
    const sw = readFileSync(resolve(__dirname, "../../web/public/sw.js"), "utf8");
    expect(sw).toContain("isDocument");
    expect(sw).toContain("isPrivateDocument");
    expect(sw).toContain('"/wallet/"');
    expect(sw).toContain('"/chat/"');
    expect(sw).toContain("mayStoreDocument");
    expect(sw).not.toContain("Googlebot");
    expect(sw).toContain("GIGA3_CHUNK_STALE");
    expect(sw).toContain("SKIP_WAITING");
  });

  it("bumps launcher badge on push when no visible client", () => {
    const sw = readFileSync(resolve(__dirname, "../../web/public/sw.js"), "utf8");
    expect(sw).toContain("GIGA3_CLEAR_BADGE");
    expect(sw).toContain("setAppBadge");
    expect(sw).toContain("renotify: true");
  });
});

describe("offline.html", () => {
  it("is lightweight and probes /api/health with retry", () => {
    const html = readFileSync(resolve(__dirname, "../../web/public/offline.html"), "utf8");
    expect(html.length).toBeLessThan(10 * 1024);
    expect(html).toContain("#5B21B6");
    expect(html).toContain("/api/health");
    expect(html).toContain("navigator.onLine");
    expect(html).toContain("Try again");
    expect(html).toContain("Go to home");
    expect(html).toContain("Cached version available");
  });
});

describe("SPA routing fallbacks", () => {
  it("does not rewrite unknown URLs to the homepage", () => {
    const redirects = readFileSync(resolve(__dirname, "../../web/public/_redirects"), "utf8");
    const vercel = readFileSync(resolve(__dirname, "../../web/vercel.json"), "utf8");
    expect(redirects).not.toContain("/*  /index.html  200");
    expect(vercel).not.toContain('"destination": "/"');
  });
});

describe("offline fetch behavior", () => {
  async function offlineFetch(path: string, mode: string, cached?: Response, networkResponse?: Response) {
    const { runInNewContext } = await import("node:vm");
    const listeners = new Map<string, (event: {
      request: { method: string; url: string; mode: string; headers: Headers };
      respondWith: (response: Promise<Response>) => void;
    }) => void>();
    const url = `https://www.giga3ai.com${path}`;
    runInNewContext(readFileSync(resolve(__dirname, "../../web/public/sw.js"), "utf8"), {
      self: {
        location: { origin: "https://www.giga3ai.com" },
        addEventListener: (type: string, handler: (event: never) => void) => listeners.set(type, handler),
      },
      caches: {
        match: async (request: { url: string } | string) =>
          typeof request !== "string" && request.url === url ? cached : undefined,
      },
      fetch: async () => {
        if (networkResponse) return networkResponse;
        throw new Error("offline");
      },
      URL, Response, AbortController, setTimeout, clearTimeout,
    });
    return new Promise<Response>((resolveResponse) => {
      listeners.get("fetch")!({
        request: { method: "GET", url, mode, headers: new Headers() },
        respondWith: resolveResponse,
      });
    });
  }

  it("returns HTML for uncached public, private, and direct API navigation", async () => {
    for (const path of ["/gigasocial/", "/chat/", "/api/health"]) {
      const response = await offlineFetch(path, "navigate");
      expect(response.status).toBe(503);
      expect(response.headers.get("content-type")).toContain("text/html");
      expect(await response.text()).toContain("Check your connection");
    }
  });

  it("keeps programmatic API failures in JSON", async () => {
    const response = await offlineFetch("/api/health", "cors");
    expect(await response.json()).toEqual({ error: "offline" });
  });

  it("uses cached public HTML during a gateway failure and skips private cache entries", async () => {
    const cached = new Response("<p>Cached page</p>", { headers: { "Content-Type": "text/html" } });
    const outage = new Response('{"error":"offline"}', { status: 503 });
    expect(await offlineFetch("/gigasocial/", "navigate", cached, outage)).toBe(cached);
    expect(await offlineFetch("/chat/", "navigate", cached, outage)).not.toBe(cached);
  });

  it("does not delete offline caches when an uncached script cannot load", async () => {
    const response = await offlineFetch("/_next/missing.js", "cors");
    expect(response.status).toBe(503);
  });
});
