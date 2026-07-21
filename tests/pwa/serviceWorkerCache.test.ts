import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("service worker cache version", () => {
  it("uses Phase 4 production-readiness cache name (v170)", () => {
    const sw = readFileSync(resolve(__dirname, "../../web/public/sw.js"), "utf8");
    expect(sw).toContain('CACHE_NAME = "giga3-shell-v170-production-readiness"');
    expect(sw).toContain('pathname.startsWith("/wallet/")');
    expect(sw).toContain('pathname.startsWith("/admin/")');
  });
});
