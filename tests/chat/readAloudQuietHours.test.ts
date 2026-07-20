import { describe, expect, it } from "vitest";
import { isWithinQuietHours } from "../../convex/pushQuietHours";
import { stripMarkdownForSpeech } from "../../web/lib/chat/readAloud";

describe("readAloud helpers", () => {
  it("strips markdown for speech", () => {
    expect(stripMarkdownForSpeech("**Hello** `world`")).toBe("Hello world");
    expect(stripMarkdownForSpeech("```js\ncode\n```")).toContain("code block");
  });
});

describe("push quiet hours", () => {
  it("detects quiet hours within same-day window", () => {
    const prefs = { quietHoursEnabled: true, quietHoursStart: "22:00", quietHoursEnd: "07:00" };
    expect(isWithinQuietHours(prefs, new Date("2026-07-20T23:00:00"))).toBe(true);
    expect(isWithinQuietHours(prefs, new Date("2026-07-20T12:00:00"))).toBe(false);
  });

  it("returns false when quiet hours disabled", () => {
    expect(isWithinQuietHours({ quietHoursEnabled: false }, new Date())).toBe(false);
  });
});
