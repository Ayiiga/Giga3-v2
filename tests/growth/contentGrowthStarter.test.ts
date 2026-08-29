import {
  contentPotential,
  contentRecommendations,
} from "@/lib/content-engine/starter";
import { describe, expect, it } from "vitest";

describe("content growth starter recommendations", () => {
  it("offers existing creator tools for each supported input type", () => {
    for (const source of ["idea", "text", "product"] as const) {
      expect(contentRecommendations(source).length).toBeGreaterThan(0);
      expect(contentRecommendations(source).every((item) => item.toolId)).toBe(true);
    }
  });

  it("uses a bounded transparent content-strength heuristic", () => {
    expect(contentPotential("").score).toBe(0);
    expect(contentPotential("A short idea").score).toBeGreaterThan(0);
    expect(
      contentPotential("Would you like to discover a useful way for your customers to learn and share? Start today!")
        .score
    ).toBeLessThanOrEqual(80);
  });
});
