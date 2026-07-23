import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getAfricaRegion, listAfricaRegions } from "../../web/lib/regions/africa";

describe("Phase 6 Africa scale modules", () => {
  it("gates each module behind its phase6 flag", () => {
    const files = [
      "phase6MultiRegion.ts",
      "phase6CreatorEcosystem.ts",
      "phase6Education.ts",
      "phase6OrgAccounts.ts",
      "phase6AiPlatform.ts",
      "phase6Commerce.ts",
      "phase6Operations.ts",
      "phase6Partnerships.ts",
      "phase6Compliance.ts",
    ];
    for (const file of files) {
      const src = readFileSync(resolve(__dirname, `../../convex/${file}`), "utf8");
      expect(src).toContain("isPhase6FlagEnabled");
    }
  });

  it("provides Africa region catalog with Ghana default", () => {
    expect(listAfricaRegions().length).toBeGreaterThanOrEqual(8);
    expect(getAfricaRegion("GH").currency).toBe("GHS");
    expect(getAfricaRegion("NG").timeZone).toBe("Africa/Lagos");
  });

  it("client hub early-returns when all flags are off", () => {
    const hub = readFileSync(
      resolve(__dirname, "../../web/components/phase6/Phase6ScaleHub.tsx"),
      "utf8"
    );
    expect(hub).toContain("if (!any || !token) return null");
  });
});
