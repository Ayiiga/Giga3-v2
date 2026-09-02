import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GRANDFATHERED_SUBSCRIBER_EMAIL,
  isGrandfatheredSubscriber,
  normalizeSubscriberEmail,
} from "../../convex/subscriptionPolicy";

describe("subscriptionPolicy", () => {
  it("normalizes email for comparison", () => {
    expect(normalizeSubscriberEmail("  AyIiGa3@Gmail.COM ")).toBe(
      GRANDFATHERED_SUBSCRIBER_EMAIL
    );
  });

  it("identifies the grandfathered subscriber (migration helper only)", () => {
    expect(isGrandfatheredSubscriber("ayiiga3@gmail.com")).toBe(true);
    expect(isGrandfatheredSubscriber("other@example.com")).toBe(false);
  });

  it("no longer blocks any account from starting a checkout", () => {
    const files = [
      "../../convex/paystack.ts",
      "../../convex/subscriptions.ts",
      "../../convex/videoInternal.ts",
      "../../convex/subscriptionPolicy.ts",
    ];
    for (const file of files) {
      const src = readFileSync(resolve(__dirname, file), "utf8");
      expect(src, file).not.toContain("isBlockedFromNewSubscription");
      expect(src, file).not.toContain("SUBSCRIPTION_CHECKOUT_BLOCKED_MESSAGE");
    }
  });
});
