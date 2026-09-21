import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("service worker cache version", () => {
  it("uses giga3-v8 cache with offline.html fallback", () => {
    const sw = readFileSync(resolve(__dirname, "../../web/public/sw.js"), "utf8");
    expect(sw).toContain('CACHE_VERSION = "giga3-v8"');
    expect(sw).toContain('OFFLINE_URL = "/offline.html"');
    expect(sw).toContain("requireInteraction: true");
    expect(sw).toContain("NETWORK_TIMEOUT_MS");
    expect(sw).toContain("fetchWithTimeout");
    expect(sw).toContain("handleStaleChunk");
    expect(sw).toContain('"/api/"');
  });

  it("network-first navigation with offline.html fallback", () => {
    const sw = readFileSync(resolve(__dirname, "../../web/public/sw.js"), "utf8");
    expect(sw).toContain("isDocument");
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
  it("ships Cloudflare catch-all and Vercel rewrite for hard-reload recovery", () => {
    const redirects = readFileSync(resolve(__dirname, "../../web/public/_redirects"), "utf8");
    const vercel = readFileSync(resolve(__dirname, "../../web/vercel.json"), "utf8");
    expect(redirects).toContain("/*  /index.html  200");
    expect(vercel).toContain('"rewrites"');
    expect(vercel).toContain('"destination": "/"');
  });
});
