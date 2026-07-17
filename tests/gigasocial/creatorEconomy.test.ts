import { describe, expect, it } from "vitest";
import {
  DEFAULT_MIN_FANS_FOR_MONETIZATION,
  fanProgressPercent,
  formatGhs,
  isCreatorMonetizationUnlocked,
} from "@/lib/gigasocial/creatorEconomy";
import { FAN_LABELS } from "@/lib/gigasocial/fanBranding";
import { CAMERA_CAPTURE_MODES, getCameraMode } from "@/lib/gigasocial/cameraModes";

describe("creatorEconomy", () => {
  it("formats GHS amounts", () => {
    expect(formatGhs(12.5)).toBe("GHC 12.50");
  });

  it("calculates fan progress toward monetization unlock", () => {
    expect(fanProgressPercent(250, DEFAULT_MIN_FANS_FOR_MONETIZATION)).toBe(50);
    expect(fanProgressPercent(600, DEFAULT_MIN_FANS_FOR_MONETIZATION)).toBe(100);
  });

  it("unlocks monetization at threshold", () => {
    expect(isCreatorMonetizationUnlocked(499)).toBe(false);
    expect(isCreatorMonetizationUnlocked(500)).toBe(true);
    expect(isCreatorMonetizationUnlocked(10, true)).toBe(true);
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
  });

  it("defaults to standard auto mode", () => {
    expect(getCameraMode(null).id).toBe("standard");
  });
});
