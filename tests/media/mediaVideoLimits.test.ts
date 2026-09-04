import { describe, expect, it } from "vitest";
import {
  MEDIA_VIDEO_DURATION_OPTIONS,
  MEDIA_VIDEO_MAX_DURATION_SEC,
  clampMediaVideoDurationSec,
  clampReplicateVideoDurationSec,
} from "../../convex/mediaVideoLimits";

describe("mediaVideoLimits", () => {
  it("exposes 5s, 10s, and 15s duration options", () => {
    expect(MEDIA_VIDEO_DURATION_OPTIONS).toEqual([5, 10, 15]);
    expect(MEDIA_VIDEO_MAX_DURATION_SEC).toBe(15);
  });

  it("clamps requested durations to the nearest supported tier", () => {
    expect(clampMediaVideoDurationSec(undefined)).toBe(10);
    expect(clampMediaVideoDurationSec(5)).toBe(5);
    expect(clampMediaVideoDurationSec(10)).toBe(10);
    expect(clampMediaVideoDurationSec(15)).toBe(15);
    expect(clampMediaVideoDurationSec(30)).toBe(15);
    expect(clampMediaVideoDurationSec(60)).toBe(15);
    expect(clampMediaVideoDurationSec(3)).toBe(5);
  });

  it("clamps replicate durations to provider max (15s)", () => {
    expect(clampReplicateVideoDurationSec(30)).toBe(15);
    expect(clampReplicateVideoDurationSec(10)).toBe(10);
  });
});
