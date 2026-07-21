import { describe, expect, it } from "vitest";
import {
  advanceTeleprompterOffset,
  clampTeleprompterCountdown,
  clampTeleprompterFontSize,
  clampTeleprompterMargin,
  clampTeleprompterSpeed,
  DEFAULT_TELEPROMPTER_SCRIPT,
} from "../../web/lib/gigasocial/teleprompter";
import { generateTeleprompterScript } from "../../web/lib/gigasocial/teleprompterScripts";

describe("teleprompter helpers", () => {
  it("exposes a default script", () => {
    expect(DEFAULT_TELEPROMPTER_SCRIPT.length).toBeGreaterThan(20);
  });

  it("clamps speed, font size, margins, and countdown", () => {
    expect(clampTeleprompterSpeed(5)).toBe(20);
    expect(clampTeleprompterSpeed(200)).toBe(120);
    expect(clampTeleprompterFontSize(10)).toBe(14);
    expect(clampTeleprompterFontSize(40)).toBe(36);
    expect(clampTeleprompterMargin(-4)).toBe(0);
    expect(clampTeleprompterMargin(80)).toBe(48);
    expect(clampTeleprompterCountdown(12)).toBe(10);
  });

  it("advances scroll offset while recording", () => {
    expect(advanceTeleprompterOffset(0, 60, 1000, false)).toBe(60);
    expect(advanceTeleprompterOffset(10, 60, 500, false)).toBe(40);
    expect(advanceTeleprompterOffset(10, 60, 500, true)).toBe(10);
  });

  it("generates a structured AI script from a topic", () => {
    const script = generateTeleprompterScript("solar power");
    expect(script).toContain("solar power");
    expect(script.toLowerCase()).toContain("hook");
  });
});
