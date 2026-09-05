import { describe, expect, it } from "vitest";
import {
  getActiveTeleprompterLineIndex,
  getTeleprompterLineAppearance,
  splitTeleprompterLines,
} from "../../web/lib/gigasocial/teleprompterDisplay";

describe("teleprompterDisplay", () => {
  it("splits script into lines", () => {
    expect(splitTeleprompterLines("Line one\nLine two")).toEqual(["Line one", "Line two"]);
  });

  it("highlights the active reading window", () => {
    const active = getTeleprompterLineAppearance(1, 1, "#4ADE80");
    const upcoming = getTeleprompterLineAppearance(3, 1, "#4ADE80");
    expect(active.opacity).toBe(1);
    expect(active.color).toBe("#4ADE80");
    expect(upcoming.opacity).toBeLessThan(active.opacity);
  });

  it("maps scroll offset to active line index", () => {
    expect(getActiveTeleprompterLineIndex(0, 28)).toBe(0);
    expect(getActiveTeleprompterLineIndex(60, 28)).toBe(1);
  });
});
