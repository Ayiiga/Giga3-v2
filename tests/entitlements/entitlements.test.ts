import { describe, expect, it } from "vitest";
import {
  computeEntitlements,
  hasFeature,
  requireFeature,
} from "../../convex/entitlements";

describe("entitlements layer", () => {
  it("free users can chat but not use pro model tier", () => {
    const entitlements = computeEntitlements({
      subscriptionPlan: "free",
      subscriptionExpiresAt: null,
      credits: 10,
    });
    expect(hasFeature(entitlements, "chat")).toBe(true);
    expect(hasFeature(entitlements, "chat_pro_model")).toBe(false);
    expect(hasFeature(entitlements, "creator_studio")).toBe(false);
  });

  it("pro subscribers unlock creator features", () => {
    const entitlements = computeEntitlements({
      subscriptionPlan: "pro",
      subscriptionExpiresAt: Date.now() + 86_400_000,
      credits: 200,
    });
    expect(hasFeature(entitlements, "chat_pro_model")).toBe(true);
    expect(hasFeature(entitlements, "creator_studio")).toBe(true);
    expect(hasFeature(entitlements, "marketplace_listing")).toBe(true);
    expect(hasFeature(entitlements, "team_storage")).toBe(false);
  });

  it("premium business plan unlocks team storage", () => {
    const entitlements = computeEntitlements({
      subscriptionPlan: "premium",
      subscriptionExpiresAt: Date.now() + 86_400_000,
    });
    expect(hasFeature(entitlements, "team_storage")).toBe(true);
    expect(hasFeature(entitlements, "api_access")).toBe(true);
  });

  it("requireFeature throws with readable upgrade message", () => {
    const entitlements = computeEntitlements({
      subscriptionPlan: "free",
      subscriptionExpiresAt: null,
    });
    expect(() => requireFeature(entitlements, "media_studio")).toThrow(/plan upgrade/i);
  });
});
