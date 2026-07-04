import { describe, expect, it } from "vitest";
import {
  GRANDFATHERED_SUBSCRIBER_EMAIL,
  isBlockedFromNewSubscription,
  isGrandfatheredSubscriber,
  normalizeSubscriberEmail,
} from "../../convex/subscriptionPolicy";

describe("subscriptionPolicy", () => {
  it("normalizes email for comparison", () => {
    expect(normalizeSubscriberEmail("  AyIiGa3@Gmail.COM ")).toBe(
      GRANDFATHERED_SUBSCRIBER_EMAIL
    );
  });

  it("identifies the grandfathered subscriber", () => {
    expect(isGrandfatheredSubscriber("ayiiga3@gmail.com")).toBe(true);
    expect(isGrandfatheredSubscriber("other@example.com")).toBe(false);
  });

  it("blocks only the grandfathered account from new subscriptions", () => {
    expect(isBlockedFromNewSubscription("ayiiga3@gmail.com")).toBe(true);
    expect(isBlockedFromNewSubscription("newuser@example.com")).toBe(false);
  });
});
