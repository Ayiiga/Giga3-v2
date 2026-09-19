import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("service worker cache version", () => {
  it("uses v259 PWA hardening cache with offline.html fallback", () => {
    const sw = readFileSync(resolve(__dirname, "../../web/public/sw.js"), "utf8");
    expect(sw).toContain('CACHE_VERSION = "giga3-v259-pwa-hardening"');
    expect(sw).toContain('CACHE_NAME = "giga3-shell-v259-pwa-hardening"');
    expect(sw).toContain('OFFLINE_URL = "/offline.html"');
    expect(sw).toContain('"/icons/badge-72.png"');
    expect(sw).toContain("requireInteraction: true");
    expect(sw).toContain("NETWORK_TIMEOUT_MS");
    expect(sw).toContain("fetchWithTimeout");
    expect(sw).toContain("networkFirstNavigation");
    expect(sw).toContain("handleStaleChunk");
    expect(sw).toContain('pathname.startsWith("/wallet/")');
    expect(sw).toContain('pathname.startsWith("/admin/")');
    expect(sw).toContain('pathname.startsWith("/marketplace/purchases/")');
    expect(sw).toContain('pathname.startsWith("/workspace/")');
  });

  it("network-first navigation with cache + offline.html fallback", () => {
    const sw = readFileSync(resolve(__dirname, "../../web/public/sw.js"), "utf8");
    expect(sw).toContain("isOfflineAppShellPath");
    expect(sw).toContain('pathname.startsWith("/chat/")');
    expect(sw).toContain('pathname.startsWith("/gigasocial/")');
    expect(sw).toContain('pathname.startsWith("/gigalearn/")');
    expect(sw).toContain('pathname.startsWith("/gigaedit/")');
    expect(sw).toContain("APP_SHELL_CACHE");
    expect(sw).toContain("isNextStaticAsset");
    expect(sw).toContain("giga3-social-outbox");
    expect(sw).toContain("isApiPath");
    expect(sw).toContain('"offline"');
  });

  it("never caches chat/workspace but keeps gigasocial shells offline-capable", () => {
    const sw = readFileSync(resolve(__dirname, "../../web/public/sw.js"), "utf8");
    const neverCacheFn =
      sw.match(/function isNeverCacheDocumentPath\(pathname\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
    expect(neverCacheFn).toContain("/chat/");
    expect(neverCacheFn).toContain("/workspace/");
    expect(neverCacheFn).toContain("/payment/");
    expect(sw).toContain("isNeverCacheDocumentPath");
    expect(sw).toContain('pathname.startsWith("/gigasocial/")');
  });

  it("bumps launcher badge on push when no visible client", () => {
    const sw = readFileSync(resolve(__dirname, "../../web/public/sw.js"), "utf8");
    expect(sw).toContain("GIGA3_CLEAR_BADGE");
    expect(sw).toContain("GIGA3_SET_BADGE");
    expect(sw).toContain("GIGA3_BUMP_BADGE");
    expect(sw).toContain("setAppBadge");
    expect(sw).toContain("clearAppBadge");
    expect(sw).toContain("badgeIncrement");
    expect(sw).toContain("anyClientVisible");
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
    expect(html).toContain("Open cached version");
  });
});
