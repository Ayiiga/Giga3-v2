import { describe, expect, it } from "vitest";
import {
  MEDIA_VIDEO_DEFAULT_DURATION_SEC,
  MEDIA_VIDEO_DURATION_OPTIONS,
  MEDIA_VIDEO_MAX_DURATION_SEC,
  REPLICATE_VIDEO_MAX_DURATION_SEC,
  clampMediaVideoDurationSec,
  clampReplicateVideoDurationSec,
  clampVideoDurationForProvider,
} from "../../convex/mediaVideoLimits";

describe("mediaVideoLimits", () => {
  it("exposes 10s, 30s, and 60s duration options", () => {
    expect(MEDIA_VIDEO_DURATION_OPTIONS).toEqual([10, 30, 60]);
    expect(MEDIA_VIDEO_MAX_DURATION_SEC).toBe(60);
    expect(MEDIA_VIDEO_DEFAULT_DURATION_SEC).toBe(30);
  });

  it("clamps requested durations into the supported range", () => {
    expect(clampMediaVideoDurationSec(undefined)).toBe(30);
    expect(clampMediaVideoDurationSec(10)).toBe(10);
    expect(clampMediaVideoDurationSec(60)).toBe(60);
    expect(clampMediaVideoDurationSec(5)).toBe(10);
    expect(clampMediaVideoDurationSec(90)).toBe(60);
  });

  it("clamps replicate durations to provider max (15s)", () => {
    expect(REPLICATE_VIDEO_MAX_DURATION_SEC).toBe(15);
    expect(clampReplicateVideoDurationSec(30)).toBe(15);
    expect(clampReplicateVideoDurationSec(60)).toBe(15);
    expect(clampReplicateVideoDurationSec(10)).toBe(10);
  });

  it("clamps fal requests to the model ceiling", () => {
    expect(clampVideoDurationForProvider(30, 12)).toBe(12);
    expect(clampVideoDurationForProvider(10, 12)).toBe(10);
  });
});
