import { describe, expect, it } from "vitest";
import { SOCIAL_MAX_VIDEO_DURATION_SEC } from "../../web/lib/gigasocial/constants";
import {
  computeTrimRange,
  formatVideoTime,
  needsVideoTrim,
  VIDEO_CLIP_LENGTH_OPTIONS_SEC,
} from "../../web/lib/gigasocial/videoTrim";

describe("videoTrim helpers", () => {
  it("formats seconds as m:ss", () => {
    expect(formatVideoTime(0)).toBe("0:00");
    expect(formatVideoTime(65)).toBe("1:05");
    expect(formatVideoTime(125.9)).toBe("2:05");
  });

  it("detects when trim is required", () => {
    expect(needsVideoTrim(SOCIAL_MAX_VIDEO_DURATION_SEC)).toBe(false);
    expect(needsVideoTrim(SOCIAL_MAX_VIDEO_DURATION_SEC + 0.1)).toBe(true);
    expect(needsVideoTrim(300)).toBe(true);
    expect(needsVideoTrim(0)).toBe(false);
  });

  it("computes a sliding window with optional shorter clip length", () => {
    const max = SOCIAL_MAX_VIDEO_DURATION_SEC;
    expect(computeTrimRange(300, 0, max)).toEqual({ startSec: 0, endSec: max });
    expect(computeTrimRange(300, 50, max)).toEqual({ startSec: 50, endSec: 50 + max });
    expect(computeTrimRange(300, 200, max)).toEqual({ startSec: 120, endSec: 300 });
    expect(computeTrimRange(90, 0, max)).toEqual({ startSec: 0, endSec: 90 });
    expect(computeTrimRange(300, 10, max, 60)).toEqual({ startSec: 10, endSec: 70 });
    expect(computeTrimRange(300, 250, max, 60)).toEqual({ startSec: 240, endSec: 300 });
  });

  it("exposes 60/120/180 clip length options", () => {
    expect(VIDEO_CLIP_LENGTH_OPTIONS_SEC).toEqual([60, 120, 180]);
  });
});
