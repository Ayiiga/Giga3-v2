import { describe, expect, it } from "vitest";
import {
  buildChatSubscriptionGuidanceAddon,
  shouldRecommendSubscription,
} from "../../convex/chatSubscriptionGuidance";

describe("chatSubscriptionGuidance", () => {
  it("recommends subscription for free users", () => {
    expect(
      shouldRecommendSubscription({ subscriptionPlan: "free", credits: 40 })
    ).toBe(true);
  });

  it("skips upsell for active subscribers with healthy credits", () => {
    expect(
      shouldRecommendSubscription({
        subscriptionPlan: "pro",
        subscriptionExpiresAt: Date.now() + 86400000,
        credits: 120,
      })
    ).toBe(false);
  });

  it("recommends when credits are low even on a paid plan", () => {
    expect(
      shouldRecommendSubscription({
        subscriptionPlan: "pro",
        subscriptionExpiresAt: Date.now() + 86400000,
        credits: 3,
      })
    ).toBe(true);
  });

  it("highlights Giga3 Pro at GHC 150 in the guidance addon", () => {
    const addon = buildChatSubscriptionGuidanceAddon({
      subscriptionPlan: "free",
      credits: 2,
      query: "How do I generate a video?",
    });
    expect(addon).toContain("GHC 150");
    expect(addon).toContain("Giga3 Pro");
    expect(addon).toContain("/subscribe/");
  });

  it("urges a recommendation when pricing is asked", () => {
    const addon = buildChatSubscriptionGuidanceAddon({
      subscriptionPlan: "free",
      credits: 50,
      query: "How much does subscription cost?",
    });
    expect(addon).toContain("should include a short, friendly subscription recommendation");
  });
});
