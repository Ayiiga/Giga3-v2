import { describe, expect, it } from "vitest";
import {
  advanceTeleprompterOffset,
  clampTeleprompterFontSize,
  clampTeleprompterSpeed,
  DEFAULT_TELEPROMPTER_SCRIPT,
} from "../../web/lib/gigasocial/teleprompter";

describe("teleprompter helpers", () => {
  it("exposes a default script", () => {
    expect(DEFAULT_TELEPROMPTER_SCRIPT.length).toBeGreaterThan(20);
  });

  it("clamps speed and font size", () => {
    expect(clampTeleprompterSpeed(5)).toBe(20);
    expect(clampTeleprompterSpeed(200)).toBe(120);
    expect(clampTeleprompterFontSize(10)).toBe(14);
    expect(clampTeleprompterFontSize(40)).toBe(28);
  });

  it("advances scroll offset while recording", () => {
    expect(advanceTeleprompterOffset(0, 60, 1000, false)).toBe(60);
    expect(advanceTeleprompterOffset(10, 60, 500, false)).toBe(40);
    expect(advanceTeleprompterOffset(10, 60, 500, true)).toBe(10);
  });
});
