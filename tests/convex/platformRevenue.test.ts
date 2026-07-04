import { describe, expect, it } from "vitest";
import {
  appliesPlatformFee,
  computePlatformFeeGhs,
  getPlatformFeePercent,
} from "../../convex/platformRevenue";

describe("platformRevenue", () => {
  it("defaults to 20% platform fee", () => {
    expect(getPlatformFeePercent()).toBe(20);
  });

  it("computes fee from gross amount", () => {
    expect(computePlatformFeeGhs(150)).toBe(30);
    expect(computePlatformFeeGhs(60)).toBe(12);
  });

  it("applies to subscription and credit billing only", () => {
    expect(appliesPlatformFee("subscription")).toBe(true);
    expect(appliesPlatformFee("credits")).toBe(true);
    expect(appliesPlatformFee("video_subscription")).toBe(true);
    expect(appliesPlatformFee("marketplace")).toBe(false);
  });
});
