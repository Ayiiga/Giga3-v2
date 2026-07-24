import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webPublic = join(process.cwd(), "web", "public");

describe("enterprise PWA security headers", () => {
  const headers = readFileSync(join(webPublic, "_headers"), "utf8");

  it("includes HSTS and isolation headers", () => {
    expect(headers).toContain("Strict-Transport-Security:");
    expect(headers).toContain("Cross-Origin-Opener-Policy: same-origin");
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
  });
});

describe("enterprise service worker policy", () => {
  const sw = readFileSync(join(webPublic, "sw.js"), "utf8");

  it("uses current cache generation", () => {
    expect(sw).toMatch(/giga3-shell-v\d+/);
  });

  it("does not precache authenticated chat shell", () => {
    const precacheBlock = sw.match(/const PRECACHE = \[([\s\S]*?)\];/)?.[1] ?? "";
    expect(precacheBlock).not.toContain('"/chat/"');
    expect(precacheBlock).not.toContain('"/credits/"');
  });

  it("skips offline caching for sensitive billing/admin document paths", () => {
    expect(sw).toContain("isSensitiveDocumentPath");
    expect(sw).toContain("/payment/");
    expect(sw).toContain("/wallet/");
    expect(sw).toContain("isOfflineAppShellPath");
  });

  it("allows runtime offline shells for chat and gigasocial", () => {
    expect(sw).toContain('pathname.startsWith("/chat/")');
    expect(sw).toContain('pathname.startsWith("/gigasocial/")');
    expect(sw).toContain("NEXT_STATIC_CACHE");
  });

  it("waits for user consent before skipWaiting", () => {
    expect(sw).toContain('event.data?.type === "SKIP_WAITING"');
    expect(sw).not.toMatch(/skipWaiting\(\)\s*\)/);
  });
});

describe("client auth hygiene", () => {
  it("exports clearAllClientAuth for unified logout", async () => {
    const auth = await import("../../web/lib/auth");
    expect(typeof auth.clearAllClientAuth).toBe("function");
    expect(typeof auth.signOutClient).toBe("function");
  });
});
