import { describe, expect, it } from "vitest";
import {
  DEFAULT_MIN_FANS_FOR_MONETIZATION,
  MIN_FANS_FOR_MONETIZATION,
  MIN_FANS_FOR_WITHDRAWAL,
  fanProgressPercent,
  fansRemaining,
  formatGhs,
  isCreatorMonetizationUnlocked,
  isEligibleForMonetization,
  isEligibleForWithdrawal,
  monetizationStatusMessage,
} from "@/lib/gigasocial/creatorEconomy";
import { CREATOR_MONETIZATION_POLICY_VERSION } from "@/lib/gigasocial/creatorMonetizationPolicy";
import { FAN_LABELS } from "@/lib/gigasocial/fanBranding";
import { CAMERA_CAPTURE_MODES, getCameraMode } from "@/lib/gigasocial/cameraModes";

describe("creatorEconomy eligibility", () => {
  it("formats GH₵ amounts", () => {
    expect(formatGhs(12.5)).toBe("GH₵ 12.50");
  });

  it("uses 500 fans for monetisation and 50 for withdrawals", () => {
    expect(MIN_FANS_FOR_MONETIZATION).toBe(500);
    expect(MIN_FANS_FOR_WITHDRAWAL).toBe(50);
    expect(DEFAULT_MIN_FANS_FOR_MONETIZATION).toBe(500);
  });

  it("calculates fan progress toward monetization unlock", () => {
    expect(fanProgressPercent(0, 500)).toBe(0);
    expect(fanProgressPercent(250, 500)).toBe(50);
    expect(fanProgressPercent(500, 500)).toBe(100);
    expect(fansRemaining(200, 500)).toBe(300);
  });

  it("gates monetisation eligibility at 500 fans", () => {
    expect(isEligibleForMonetization(499)).toBe(false);
    expect(isEligibleForMonetization(500)).toBe(true);
  });

  it("gates withdrawal eligibility at 50 fans", () => {
    expect(isEligibleForWithdrawal(49)).toBe(false);
    expect(isEligibleForWithdrawal(50)).toBe(true);
  });

  it("does not treat fan count alone as monetisation unlocked", () => {
    expect(isCreatorMonetizationUnlocked(500)).toBe(false);
    expect(isCreatorMonetizationUnlocked(5)).toBe(false);
    expect(isCreatorMonetizationUnlocked(2, true)).toBe(true);
  });

  it("builds clear status messages", () => {
    expect(
      monetizationStatusMessage({
        fanCount: 200,
        fansRequired: 500,
        withdrawalFansRequired: 50,
        accepted: false,
      })
    ).toContain("Invite 300 more fans");
    expect(
      monetizationStatusMessage({
        fanCount: 500,
        fansRequired: 500,
        withdrawalFansRequired: 50,
        accepted: false,
      })
    ).toMatch(/eligible to apply|Accept the creator rules/i);
    expect(
      monetizationStatusMessage({
        fanCount: 520,
        fansRequired: 500,
        withdrawalFansRequired: 50,
        accepted: false,
        requiresPolicyReacceptance: true,
      })
    ).toContain("current creator monetisation rules");
    expect(
      monetizationStatusMessage({
        fanCount: 520,
        fansRequired: 500,
        withdrawalFansRequired: 50,
        accepted: true,
      })
    ).toMatch(/withdrawals|Available balance/i);
  });

  it("publishes a stable monetisation policy version", () => {
    expect(CREATOR_MONETIZATION_POLICY_VERSION).toBe("giga-creator-monetisation-v1");
  });
});

describe("fanBranding", () => {
  it("uses Fans as primary relationship label", () => {
    expect(FAN_LABELS.fans).toBe("Fans");
    expect(FAN_LABELS.mutualFans).toBe("Mutual Fans");
  });
});

describe("cameraModes", () => {
  it("includes professional capture modes from spec", () => {
    const ids = CAMERA_CAPTURE_MODES.map((m) => m.id);
    expect(ids).toContain("standard");
    expect(ids).toContain("cinematic");
    expect(ids).toContain("night");
    expect(ids).toContain("portrait");
    expect(ids).toContain("hdr");
    expect(ids).toContain("ultra-hdr");
    expect(ids).toContain("vivid");
    expect(ids).toContain("natural");
    expect(ids).toContain("film-look");
    expect(ids).toContain("pro");
    expect(ids).toContain("video-4k");
    expect(ids).toContain("video-8k");
    expect(ids).toContain("slow-motion");
    expect(ids).toContain("time-lapse");
    expect(ids).toContain("beauty");
    expect(ids).toContain("blur");
    expect(ids).toContain("lighting");
    expect(ids).toContain("framing");
    expect(ids).toContain("stabilize");
    expect(ids).toContain("color");
  });

  it("defaults to standard auto mode", () => {
    expect(getCameraMode(null).id).toBe("standard");
    expect(getCameraMode("unknown-mode").id).toBe("standard");
  });
});
