import { describe, expect, it } from "vitest";
import {
  connectionTierFromInfo,
  readConnectionInfo,
} from "../../web/lib/network/connectionQuality";
import {
  getAdaptivePollIntervalMs,
  getConvexRetryCount,
} from "../../web/lib/network/polling";

describe("connectionQuality", () => {
  it("marks offline when navigator reports offline", () => {
    expect(connectionTierFromInfo(false, { effectiveType: "4g" })).toBe("offline");
  });

  it("marks slow on 2g and save-data", () => {
    expect(connectionTierFromInfo(true, { effectiveType: "2g" })).toBe("slow");
    expect(connectionTierFromInfo(true, { effectiveType: "slow-2g" })).toBe("slow");
    expect(connectionTierFromInfo(true, { effectiveType: "4g", saveData: true })).toBe(
      "slow"
    );
    expect(connectionTierFromInfo(true, { effectiveType: "4g", downlink: 0.2 })).toBe(
      "slow"
    );
  });

  it("defaults to normal on healthy links", () => {
    expect(connectionTierFromInfo(true, { effectiveType: "4g", downlink: 5 })).toBe(
      "normal"
    );
    expect(readConnectionInfo()).toEqual({});
  });
});

describe("adaptive polling", () => {
  it("doubles poll interval on slow tiers", () => {
    expect(getAdaptivePollIntervalMs("normal", 12_000)).toBe(12_000);
    expect(getAdaptivePollIntervalMs("slow", 12_000)).toBe(24_000);
    expect(getAdaptivePollIntervalMs("offline", 12_000)).toBe(0);
  });

  it("adds an extra convex retry on slow tiers", () => {
    expect(getConvexRetryCount("normal")).toBe(1);
    expect(getConvexRetryCount("slow")).toBe(2);
  });
});
