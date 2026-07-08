import { describe, expect, it } from "vitest";
import { sanitizeHttpHeaderValue } from "../../convex/sanitizeHttpHeader";

describe("sanitizeHttpHeaderValue", () => {
  it("removes left-to-right mark from API keys", () => {
    expect(sanitizeHttpHeaderValue("sk_test\u200Ekey")).toBe("sk_testkey");
  });

  it("removes zero-width and BOM characters", () => {
    expect(sanitizeHttpHeaderValue("\uFEFFsk_\u200Bkey\u200C")).toBe("sk_key");
  });

  it("trims surrounding whitespace after stripping invisible chars", () => {
    expect(sanitizeHttpHeaderValue("  sk_key  ")).toBe("sk_key");
  });

  it("returns undefined for empty or whitespace-only input", () => {
    expect(sanitizeHttpHeaderValue(undefined)).toBeUndefined();
    expect(sanitizeHttpHeaderValue("   ")).toBeUndefined();
    expect(sanitizeHttpHeaderValue("\u200E")).toBeUndefined();
  });
});
