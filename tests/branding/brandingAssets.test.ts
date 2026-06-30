import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BRANDING_ASSET_VERSION, brandingAssetUrl } from "../../web/lib/brandingAssets";

describe("branding assets", () => {
  it("exposes a cache-bust version for icons and splash", () => {
    expect(BRANDING_ASSET_VERSION.length).toBeGreaterThan(0);
    expect(brandingAssetUrl("/images/logo.png")).toBe(
      `/images/logo.png?v=${BRANDING_ASSET_VERSION}`
    );
  });

  it("writes branding-version.txt in sync with the TS constant", () => {
    const raw = readFileSync(
      join(process.cwd(), "web", "public", "branding-version.txt"),
      "utf8"
    ).trim();
    expect(raw).toBe(BRANDING_ASSET_VERSION);
  });

  it("uses lean install precache for faster PWA startup", () => {
    const sw = readFileSync(join(process.cwd(), "web", "public", "sw.js"), "utf8");
    expect(sw).toContain("giga3-shell-v23-perf");
    expect(sw).toContain('"/"');
    expect(sw).not.toContain('"/media/"');
    expect(sw).not.toContain('"/splash/iphone-12.png"');
  });
});
