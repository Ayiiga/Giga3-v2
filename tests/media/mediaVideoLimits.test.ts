import { describe, expect, it } from "vitest";
import {
  MEDIA_VIDEO_DEFAULT_DURATION_SEC,
  MEDIA_VIDEO_DURATION_OPTIONS,
  MEDIA_VIDEO_MAX_DURATION_SEC,
  clampMediaVideoDurationSec,
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
});
