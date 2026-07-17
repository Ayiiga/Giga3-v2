import { describe, expect, it } from "vitest";
import {
  computeTrimRange,
  formatVideoTime,
  needsVideoTrim,
} from "../../web/lib/gigasocial/videoTrim";

describe("videoTrim helpers", () => {
  it("formats seconds as m:ss", () => {
    expect(formatVideoTime(0)).toBe("0:00");
    expect(formatVideoTime(65)).toBe("1:05");
    expect(formatVideoTime(125.9)).toBe("2:05");
  });

  it("detects when trim is required", () => {
    expect(needsVideoTrim(40)).toBe(false);
    expect(needsVideoTrim(40.1)).toBe(true);
    expect(needsVideoTrim(120)).toBe(true);
  });

  it("computes a fixed 40s sliding window", () => {
    expect(computeTrimRange(120, 0, 40)).toEqual({ startSec: 0, endSec: 40 });
    expect(computeTrimRange(120, 50, 40)).toEqual({ startSec: 50, endSec: 90 });
    expect(computeTrimRange(120, 95, 40)).toEqual({ startSec: 80, endSec: 120 });
    expect(computeTrimRange(25, 0, 40)).toEqual({ startSec: 0, endSec: 25 });
  });
});
