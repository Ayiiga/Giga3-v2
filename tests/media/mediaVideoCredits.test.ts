import { describe, expect, it } from "vitest";
import {
  mediaVideoCreditCost,
  minMediaVideoCreditCost,
  snapMediaVideoDurationSec,
} from "../../convex/mediaVideoCredits";

describe("mediaVideoCredits", () => {
  it("charges 9 / 20 / 30 credits for 5s / 10s / 15s tiers", () => {
    expect(mediaVideoCreditCost(5)).toBe(9);
    expect(mediaVideoCreditCost(10)).toBe(20);
    expect(mediaVideoCreditCost(15)).toBe(30);
  });

  it("uses 2 credits per second above 5 seconds", () => {
    expect(mediaVideoCreditCost(12)).toBe(24);
  });

  it("exposes minimum tier for balance checks", () => {
    expect(minMediaVideoCreditCost()).toBe(9);
  });

  it("snaps arbitrary durations to the nearest UI tier", () => {
    expect(snapMediaVideoDurationSec(7)).toBe(5);
    expect(snapMediaVideoDurationSec(8)).toBe(10);
    expect(snapMediaVideoDurationSec(14)).toBe(15);
  });
});
