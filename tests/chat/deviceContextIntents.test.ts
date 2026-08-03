import { describe, expect, it } from "vitest";
import {
  answerDeviceContextIntent,
  matchDeviceContextIntent,
  needsLocationEnrichment,
} from "../../web/lib/chat/deviceContextIntents";
import {
  isLeapYear,
  type DeviceContextSnapshot,
} from "../../web/lib/chat/deviceContext";

const baseCtx: DeviceContextSnapshot = {
  now: new Date("2026-08-03T15:30:00+00:00"),
  locale: "en-US",
  timeZone: "UTC",
  utcOffsetMinutes: 0,
  online: true,
  theme: "dark",
  language: "en-US",
  languages: ["en-US"],
  platform: "MacIntel",
  userAgent: "Mozilla/5.0 (Macintosh) Chrome/120.0.0.0",
  viewportWidth: 390,
  viewportHeight: 844,
  orientation: "portrait-primary",
  pwaInstalled: true,
  batteryPercent: 77,
  batteryCharging: false,
};

describe("matchDeviceContextIntent", () => {
  it("matches common date/time questions", () => {
    expect(matchDeviceContextIntent("What is today's date?")).toBe("date_today");
    expect(matchDeviceContextIntent("What time is it?")).toBe("time_now");
    expect(matchDeviceContextIntent("What day of the week is it?")).toBe("day_of_week");
    expect(matchDeviceContextIntent("What's my timezone?")).toBe("timezone");
  });

  it("matches connectivity and device questions", () => {
    expect(matchDeviceContextIntent("Am I online?")).toBe("connectivity");
    expect(matchDeviceContextIntent("What browser am I using?")).toBe("device_info");
    expect(matchDeviceContextIntent("Is this year a leap year?")).toBe("leap_year");
  });

  it("does not intercept complex prompts", () => {
    expect(
      matchDeviceContextIntent("What is today's date and then draft an essay about it")
    ).toBe(null);
  });

  it("detects weather location enrichment needs", () => {
    expect(needsLocationEnrichment("What's the weather today?")).toBe(true);
    expect(needsLocationEnrichment("What is today's date?")).toBe(false);
  });
});

describe("answerDeviceContextIntent", () => {
  it("answers today's date from the device snapshot", () => {
    const answer = answerDeviceContextIntent("date_today", baseCtx);
    expect(answer).toContain("2026");
    expect(answer).toContain("UTC");
  });

  it("answers battery when available", () => {
    expect(answerDeviceContextIntent("battery", baseCtx)).toContain("77%");
  });

  it("shares leap year helper", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
  });
});
