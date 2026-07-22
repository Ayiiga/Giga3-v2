import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("service worker cache version", () => {
  it("uses tip/gift fix cache name (v171)", () => {
    const sw = readFileSync(resolve(__dirname, "../../web/public/sw.js"), "utf8");
    expect(sw).toContain('CACHE_NAME = "giga3-shell-v171-tip-gift-fix"');
    expect(sw).toContain('pathname.startsWith("/wallet/")');
    expect(sw).toContain('pathname.startsWith("/admin/")');
  });
});
