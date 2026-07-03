import { describe, expect, it } from "vitest";
import {
  CANONICAL_PRODUCTION_CONVEX_URL,
  normalizeConvexUrl,
} from "../../web/lib/convex/env";

describe("normalizeConvexUrl", () => {
  it("remaps retired deployments to production", () => {
    expect(normalizeConvexUrl("https://happy-otter-123.convex.cloud")).toBe(
      CANONICAL_PRODUCTION_CONVEX_URL
    );
  });

  it("passes through healthy production URLs", () => {
    expect(normalizeConvexUrl(CANONICAL_PRODUCTION_CONVEX_URL)).toBe(
      CANONICAL_PRODUCTION_CONVEX_URL
    );
  });

  it("returns undefined for empty input", () => {
    expect(normalizeConvexUrl(undefined)).toBeUndefined();
    expect(normalizeConvexUrl("  ")).toBeUndefined();
  });
});
