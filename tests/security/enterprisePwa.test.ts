import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webPublic = join(process.cwd(), "web", "public");

describe("enterprise PWA security headers", () => {
  const headers = readFileSync(join(webPublic, "_headers"), "utf8");

  it("includes HSTS and isolation headers", () => {
    expect(headers).toContain("Strict-Transport-Security:");
    expect(headers).toContain("Cross-Origin-Opener-Policy: same-origin-allow-popups");
    expect(headers).toContain("Cross-Origin-Resource-Policy: same-site");
    expect(headers).toContain("X-Permitted-Cross-Domain-Policies: none");
  });

  it("allows display-capture for live screen share", () => {
    expect(headers).toMatch(/Permissions-Policy:.*display-capture=\(self\)/);
  });

  it("includes worker-src and manifest-src in CSP", () => {
    expect(headers).toContain("worker-src 'self'");
    expect(headers).toContain("manifest-src 'self'");
  });

  it("marks authenticated routes as no-store", () => {
    expect(headers).toContain("/chat/*");
    expect(headers).toContain("Cache-Control: no-store");
    expect(headers).toContain("/payment/*");
    expect(headers).toContain("/marketplace/sell/*");
    expect(headers).toContain("/marketplace/purchases/*");
  });

  it("enables cross-origin isolation for GigaEdit voiceover / WebCodecs", () => {
    expect(headers).toContain("/gigaedit/*");
    expect(headers).toContain("Cross-Origin-Embedder-Policy: require-corp");
    expect(headers).toMatch(/\/gigaedit\/\*[\s\S]*Cross-Origin-Opener-Policy: same-origin/);
  });
});

describe("enterprise service worker policy", () => {
  const sw = readFileSync(join(webPublic, "sw.js"), "utf8");

  it("uses current cache generation", () => {
    expect(sw).toContain('CACHE_VERSION = "giga3-v15"');
  });

  it("does not precache authenticated chat shell", () => {
    const precacheBlock = sw.match(/const PRECACHE = \[([\s\S]*?)\];/)?.[1] ?? "";
    expect(precacheBlock).not.toContain('"/chat/"');
    expect(precacheBlock).not.toContain('"/credits/"');
  });

  it("never caches API routes", () => {
    expect(sw).toContain('url.pathname.startsWith("/api/")');
    expect(sw).toContain('"offline"');
  });

  it("falls back to offline.html for failed navigation", () => {
    expect(sw).toContain('OFFLINE_URL = "/offline.html"');
  });

  it("supports SKIP_WAITING from client and stale chunk recovery", () => {
    expect(sw).toContain('event.data?.type === "SKIP_WAITING"');
    expect(sw).toContain("GIGA3_CHUNK_STALE");
  });
});

describe("client auth hygiene", () => {
  it("exports clearAllClientAuth for unified logout", async () => {
    const auth = await import("../../web/lib/auth");
    expect(typeof auth.clearAllClientAuth).toBe("function");
    expect(typeof auth.signOutClient).toBe("function");
  });
});
