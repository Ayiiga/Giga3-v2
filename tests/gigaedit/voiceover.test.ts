import { describe, expect, it } from "vitest";
import {
  formatSafeMmSs,
  formatSafeTimecodeMs,
  safeDurationSec,
} from "../../web/lib/gigaedit/voiceover/duration";
import { isLowEndDevice, isSlowNetwork } from "../../web/lib/gigaedit/lowEndUi";
import { VOICEOVER_EXPORT_CREDITS } from "../../web/lib/gigaedit/voiceover/mux";

describe("voiceover duration guards", () => {
  it("returns 0:00 for NaN and Infinity", () => {
    expect(formatSafeMmSs(NaN)).toBe("0:00");
    expect(formatSafeMmSs(Infinity)).toBe("0:00");
    expect(formatSafeTimecodeMs(NaN)).toBe("00:00.000");
  });

  it("formats valid durations", () => {
    expect(formatSafeMmSs(65)).toBe("1:05");
    expect(safeDurationSec(-3)).toBe(0);
  });
});

describe("voiceover export credits", () => {
  it("shows 5 credits before export", () => {
    expect(VOICEOVER_EXPORT_CREDITS).toBe(5);
  });
});

describe("low-end device detection", () => {
  it("exports network and device helpers", () => {
    expect(typeof isSlowNetwork()).toBe("boolean");
    expect(typeof isLowEndDevice()).toBe("boolean");
  });
});
