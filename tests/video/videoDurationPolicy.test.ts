import {
  assertVideoDurationWithinPlan,
  FREE_MAX_VIDEO_DURATION_SEC,
  maxVideoDurationSecForPlan,
  PREMIUM_MAX_VIDEO_DURATION_SEC,
} from "../../convex/videoDurationPolicy";
import { describe, expect, it } from "vitest";

const now = 1_700_000_000_000;

describe("video duration entitlement policy", () => {
  it("enforces exact Free boundaries", () => {
    for (const durationSec of [0, 10, 20]) {
      expect(() => assertVideoDurationWithinPlan({ durationSec, now })).not.toThrow();
    }
    for (const durationSec of [20.01, 21]) {
      expect(() => assertVideoDurationWithinPlan({ durationSec, now })).toThrow("20 seconds");
    }
  });

  it("enforces exact active Premium boundaries using server entitlement fields", () => {
    const entitlement = { subscriptionPlan: "premium", subscriptionExpiresAt: now + 1, now };
    expect(maxVideoDurationSecForPlan(entitlement)).toBe(PREMIUM_MAX_VIDEO_DURATION_SEC);
    expect(() => assertVideoDurationWithinPlan({ ...entitlement, durationSec: 185 })).not.toThrow();
    expect(() => assertVideoDurationWithinPlan({ ...entitlement, durationSec: 185.01 })).toThrow(
      "3 minutes 5 seconds"
    );
    expect(() => assertVideoDurationWithinPlan({ ...entitlement, durationSec: 186 })).toThrow();
  });

  it("treats expired or non-Premium client claims as Free", () => {
    expect(
      maxVideoDurationSecForPlan({ subscriptionPlan: "premium", subscriptionExpiresAt: now, now })
    ).toBe(FREE_MAX_VIDEO_DURATION_SEC);
    expect(maxVideoDurationSecForPlan({ subscriptionPlan: "pro", subscriptionExpiresAt: now + 1, now })).toBe(
      FREE_MAX_VIDEO_DURATION_SEC
    );
    expect(() => assertVideoDurationWithinPlan({ durationSec: Number.NaN, now })).toThrow("invalid");
  });
});
