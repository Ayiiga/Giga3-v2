import { describe, expect, it } from "vitest";
import { FREE_ADVANCED_PERSONA_DAILY_LIMIT } from "../../convex/freeAdvancedPersonaQuota";
import { computeEntitlements, hasFeature } from "../../convex/entitlements";

describe("FREE_ADVANCED_PERSONA_DAILY_LIMIT", () => {
  it("defaults to 15 free persona questions per day", () => {
    expect(FREE_ADVANCED_PERSONA_DAILY_LIMIT).toBe(15);
  });

  it("stays in a sensible free-tier band", () => {
    expect(FREE_ADVANCED_PERSONA_DAILY_LIMIT).toBeGreaterThanOrEqual(5);
    expect(FREE_ADVANCED_PERSONA_DAILY_LIMIT).toBeLessThanOrEqual(50);
  });
});

describe("advanced_personas entitlement vs free quota", () => {
  it("keeps advanced_personas paid-only in computeEntitlements (quota is separate)", () => {
    const free = computeEntitlements({
      subscriptionPlan: "free",
      subscriptionExpiresAt: null,
    });
    expect(hasFeature(free, "advanced_personas")).toBe(false);

    const pro = computeEntitlements({
      subscriptionPlan: "pro",
      subscriptionExpiresAt: Date.now() + 86_400_000,
    });
    expect(hasFeature(pro, "advanced_personas")).toBe(true);
  });
});
