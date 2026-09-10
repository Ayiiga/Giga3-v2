import { describe, expect, it } from "vitest";
import { computeEntitlements } from "../../convex/entitlements";
import { buildRecommendations } from "../../convex/recommendationsLogic";

describe("recommendations engine", () => {
  it("marks pro studio recs for free users and includes a free alternative", () => {
    const entitlements = computeEntitlements({
      subscriptionPlan: "free",
      subscriptionExpiresAt: null,
      credits: 25,
    });
    const recs = buildRecommendations({
      surface: "chat",
      limit: 6,
      entitlements,
      creditsLeft: 25,
      recentTopics: [],
    });
    const studio = recs.find((item) => item.title === "Media Studio image");
    expect(studio?.entitlement).toBe("pro");
    expect(recs.some((item) => item.title === "GigaLearn practice")).toBe(true);
  });

  it("returns at least one learn action for BECE tutor persona", () => {
    const entitlements = computeEntitlements({
      subscriptionPlan: "basic",
      subscriptionExpiresAt: Date.now() + 86_400_000,
      credits: 50,
    });
    const recs = buildRecommendations({
      surface: "chat",
      currentPersonaId: "bece_tutor",
      limit: 4,
      entitlements,
      creditsLeft: 50,
      recentTopics: [],
    });
    expect(
      recs.some(
        (item) =>
          item.action === "/gigalearn/" ||
          item.title.toLowerCase().includes("gigalearn") ||
          item.title.toLowerCase().includes("bece")
      )
    ).toBe(true);
  });

  it("respects the limit parameter", () => {
    const recs = buildRecommendations({
      surface: "learn",
      limit: 2,
      entitlements: null,
      creditsLeft: null,
      recentTopics: [],
    });
    expect(recs.length).toBeLessThanOrEqual(2);
  });

  it("adds a low-credit free action when credits are below 10", () => {
    const recs = buildRecommendations({
      surface: "chat",
      limit: 4,
      entitlements: computeEntitlements({ subscriptionPlan: "free", credits: 5 }),
      creditsLeft: 5,
      recentTopics: [],
    });
    expect(recs.some((item) => item.title.includes("Short explain"))).toBe(true);
  });
});
