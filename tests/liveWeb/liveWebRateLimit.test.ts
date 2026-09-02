import { describe, expect, it } from "vitest";
import { liveWebRateLimitPerHour } from "../../convex/liveWeb/liveWebConfig";

describe("liveWeb rate limit config", () => {
  it("defaults to 30 requests per hour", () => {
    delete process.env.LIVE_WEB_RATE_LIMIT_PER_HOUR;
    expect(liveWebRateLimitPerHour()).toBe(30);
  });

  it("respects LIVE_WEB_RATE_LIMIT_PER_HOUR env override", () => {
    process.env.LIVE_WEB_RATE_LIMIT_PER_HOUR = "5";
    expect(liveWebRateLimitPerHour()).toBe(5);
    delete process.env.LIVE_WEB_RATE_LIMIT_PER_HOUR;
  });
});
