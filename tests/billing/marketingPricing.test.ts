import { describe, expect, it } from "vitest";
import {
  buildHomepagePricingTeasers,
  defaultPaidPlanUpsell,
  subscriptionPlanLabel,
} from "@/lib/payments/marketingPricing";
import {
  FREE_STARTER_CREDITS,
  SUBSCRIPTION_PLANS,
} from "@/lib/payments/subscriptionCatalog";
import { formatGhs } from "@/lib/payments/plans";

describe("marketingPricing", () => {
  it("derives homepage teasers from subscriptionCatalog", () => {
    const teasers = buildHomepagePricingTeasers();
    expect(teasers).toHaveLength(4);
    expect(teasers[0].name).toBe("Free");
    expect(teasers[0].features[0]).toBe(`${FREE_STARTER_CREDITS} starter credits`);
    expect(teasers[1].name).toBe(SUBSCRIPTION_PLANS.basic.label);
    expect(teasers[1].price).toBe(formatGhs(SUBSCRIPTION_PLANS.basic.priceGhs));
    expect(teasers[2].name).toBe(SUBSCRIPTION_PLANS.pro.label);
    expect(teasers[2].highlighted).toBe(true);
    expect(teasers[3].name).toBe(SUBSCRIPTION_PLANS.premium.label);
  });

  it("uses canonical plan labels", () => {
    expect(subscriptionPlanLabel("basic")).toBe("Basic");
    expect(subscriptionPlanLabel("pro")).toBe("Pro");
    expect(subscriptionPlanLabel("premium")).toBe("Premium");
  });

  it("formats default paid plan upsell from catalog values", () => {
    const upsell = defaultPaidPlanUpsell();
    expect(upsell).toContain(SUBSCRIPTION_PLANS.pro.label);
    expect(upsell).toContain(formatGhs(SUBSCRIPTION_PLANS.pro.priceGhs));
    expect(upsell).toContain(String(SUBSCRIPTION_PLANS.pro.credits));
  });
});
