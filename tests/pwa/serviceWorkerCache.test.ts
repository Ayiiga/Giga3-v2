import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("service worker cache version", () => {
  it("uses video text guard cache name (v226)", () => {
    const sw = readFileSync(resolve(__dirname, "../../web/public/sw.js"), "utf8");
    expect(sw).toContain('CACHE_NAME = "giga3-shell-v226-video-text-guard"');
    expect(sw).toContain('NEXT_STATIC_CACHE = "giga3-next-static-v220"');
    expect(sw).toContain('APP_SHELL_CACHE = "giga3-app-shell-v220"');
    expect(sw).toContain('pathname.startsWith("/wallet/")');
    expect(sw).toContain('pathname.startsWith("/admin/")');
    expect(sw).toContain('pathname.startsWith("/marketplace/purchases/")');
    expect(sw).toContain('pathname.startsWith("/workspace/")');
  });

  it("network-first caches chat/gigasocial/gigalearn/gigaedit shells for offline reopen", () => {
    const sw = readFileSync(resolve(__dirname, "../../web/public/sw.js"), "utf8");
    expect(sw).toContain("isOfflineAppShellPath");
    expect(sw).toContain('pathname.startsWith("/chat/")');
    expect(sw).toContain('pathname.startsWith("/gigasocial/")');
    expect(sw).toContain('pathname.startsWith("/gigalearn/")');
    expect(sw).toContain('pathname.startsWith("/gigaedit/")');
    expect(sw).toContain("APP_SHELL_CACHE");
    expect(sw).toContain("network-first");
    expect(sw).toContain("isNextStaticAsset");
    expect(sw).toContain("giga3-social-outbox");
  });

  it("does not treat chat/gigasocial/gigalearn as never-cache sensitive paths", () => {
    const sw = readFileSync(resolve(__dirname, "../../web/public/sw.js"), "utf8");
    const sensitiveFn =
      sw.match(/function isSensitiveDocumentPath\(pathname\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
    expect(sensitiveFn).toContain("/payment/");
    expect(sensitiveFn).not.toContain("/chat/");
    expect(sensitiveFn).not.toContain("/gigasocial/");
    expect(sensitiveFn).not.toContain("/gigalearn/");
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
