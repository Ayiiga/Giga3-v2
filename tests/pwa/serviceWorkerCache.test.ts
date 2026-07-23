import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("service worker cache version", () => {
  it("uses RC1 cache name (v180)", () => {
    const sw = readFileSync(resolve(__dirname, "../../web/public/sw.js"), "utf8");
    expect(sw).toContain('CACHE_NAME = "giga3-shell-v180-rc1"');
    expect(sw).toContain('NEXT_STATIC_CACHE = "giga3-next-static-v180"');
    expect(sw).toContain('pathname.startsWith("/wallet/")');
    expect(sw).toContain('pathname.startsWith("/admin/")');
  });

  it("runtime-caches chat and gigasocial shells for offline reopen", () => {
    const sw = readFileSync(resolve(__dirname, "../../web/public/sw.js"), "utf8");
    expect(sw).toContain("isOfflineAppShellPath");
    expect(sw).toContain('pathname.startsWith("/chat/")');
    expect(sw).toContain('pathname.startsWith("/gigasocial/")');
    expect(sw).toContain("isNextStaticAsset");
    expect(sw).toContain("giga3-social-outbox");
  });

  it("does not treat chat/gigasocial as never-cache sensitive paths", () => {
    const sw = readFileSync(resolve(__dirname, "../../web/public/sw.js"), "utf8");
    const sensitiveFn =
      sw.match(/function isSensitiveDocumentPath\(pathname\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
    expect(sensitiveFn).toContain("/payment/");
    expect(sensitiveFn).not.toContain("/chat/");
    expect(sensitiveFn).not.toContain("/gigasocial/");
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
