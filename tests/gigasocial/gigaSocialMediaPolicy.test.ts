import { describe, expect, it } from "vitest";
import {
  assertSocialVideoDuration,
  SOCIAL_MAX_VIDEO_DURATION_SEC,
} from "../../convex/gigaSocialMediaPolicy";

describe("gigaSocialMediaPolicy", () => {
  it("accepts videos up to three minutes", () => {
    expect(() => assertSocialVideoDuration(1)).not.toThrow();
    expect(() => assertSocialVideoDuration(SOCIAL_MAX_VIDEO_DURATION_SEC)).not.toThrow();
  });

  it("rejects missing, zero, or over-limit durations", () => {
    expect(() => assertSocialVideoDuration(undefined)).toThrow("3 minutes");
    expect(() => assertSocialVideoDuration(0)).toThrow("3 minutes");
    expect(() => assertSocialVideoDuration(SOCIAL_MAX_VIDEO_DURATION_SEC + 1)).toThrow("3 minutes");
  });
});
