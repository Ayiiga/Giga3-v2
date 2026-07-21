import { describe, expect, it } from "vitest";
import {
  isSocialWriteRateLimitEnabled,
  socialWriteLimitForAction,
} from "../../convex/socialRateLimit";
import {
  assertSafeUploadFileName,
  looksLikeAllowedImageBytes,
} from "../../convex/uploadSecurity";

describe("socialWriteRateLimit", () => {
  it("defines limits for post/comment/like writes", () => {
    expect(socialWriteLimitForAction("create_post")?.max).toBe(30);
    expect(socialWriteLimitForAction("add_comment")?.max).toBe(60);
    expect(socialWriteLimitForAction("toggle_like")?.max).toBe(120);
    expect(socialWriteLimitForAction("unknown")).toBeNull();
  });

  it("defaults to enabled when env unset", () => {
    const prev = process.env.GIGA3_SOCIAL_WRITE_RATE_LIMIT;
    delete process.env.GIGA3_SOCIAL_WRITE_RATE_LIMIT;
    expect(isSocialWriteRateLimitEnabled()).toBe(true);
    process.env.GIGA3_SOCIAL_WRITE_RATE_LIMIT = "false";
    expect(isSocialWriteRateLimitEnabled()).toBe(false);
    if (prev === undefined) delete process.env.GIGA3_SOCIAL_WRITE_RATE_LIMIT;
    else process.env.GIGA3_SOCIAL_WRITE_RATE_LIMIT = prev;
  });
});

describe("uploadSecurity", () => {
  it("rejects dangerous extensions and path tricks", () => {
    expect(() => assertSafeUploadFileName("malware.exe")).toThrow(/not allowed/i);
    expect(() => assertSafeUploadFileName("../secret.png")).toThrow(/Invalid/);
    expect(() => assertSafeUploadFileName("note.html")).toThrow(/not allowed/i);
    expect(assertSafeUploadFileName("holiday photo.JPG")).toContain("holiday");
  });

  it("sniffs common image magic bytes", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(looksLikeAllowedImageBytes(jpeg)).toBe(true);
    expect(looksLikeAllowedImageBytes(png)).toBe(true);
    expect(looksLikeAllowedImageBytes(new Uint8Array([1, 2, 3]))).toBe(false);
  });
});
