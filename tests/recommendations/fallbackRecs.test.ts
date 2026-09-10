import { describe, expect, it } from "vitest";
import { offlineRecommendations } from "@/lib/recommendations/fallbackRecs";

describe("offlineRecommendations", () => {
  it("returns surface-specific fallbacks without wallet data", () => {
    const social = offlineRecommendations("social", 3);
    expect(social.length).toBeLessThanOrEqual(3);
    for (const item of social) {
      expect(item.entitlement).toBe("free");
      expect(JSON.stringify(item)).not.toMatch(/creditsLeft|wallet|balance/i);
    }
  });

  it("respects limit for each surface", () => {
    expect(offlineRecommendations("edit", 1)).toHaveLength(1);
    expect(offlineRecommendations("studio", 2).length).toBeLessThanOrEqual(2);
  });
});
