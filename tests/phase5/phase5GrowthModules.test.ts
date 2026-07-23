import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Phase 5 growth modules", () => {
  it("gates each module behind its phase5 flag", () => {
    const files = [
      "phase5CreatorSuccess.ts",
      "phase5CommunityGrowth.ts",
      "phase5Education.ts",
      "phase5Personalization.ts",
      "phase5Monetization.ts",
      "phase5ProductAnalytics.ts",
    ];
    for (const file of files) {
      const src = readFileSync(resolve(__dirname, `../../convex/${file}`), "utf8");
      expect(src).toContain("isPhase5FlagEnabled");
    }
  });

  it("includes local caption/hashtag helpers (no external AI)", () => {
    const src = readFileSync(
      resolve(__dirname, "../../convex/phase5CreatorSuccess.ts"),
      "utf8"
    );
    expect(src).toContain("export function suggestCaptions");
    expect(src).toContain("export function suggestHashtags");
    expect(src).toContain("#Giga3");
  });

  it("client hub early-returns when all growth flags are off", () => {
    const hub = readFileSync(
      resolve(__dirname, "../../web/components/phase5/Phase5GrowthHub.tsx"),
      "utf8"
    );
    expect(hub).toContain("if (!any || !token) return null");
  });

  it("adds challenge tables additively", () => {
    const schema = readFileSync(
      resolve(__dirname, "../../convex/schema.ts"),
      "utf8"
    );
    expect(schema).toContain("betaDailyChallenges");
    expect(schema).toContain("betaChallengeCompletions");
  });
});
