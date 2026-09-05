import { describe, expect, it } from "vitest";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeSlug(slug: string): string | null {
  const normalized = slug.trim().toLowerCase();
  if (!normalized || normalized.length > 120) return null;
  if (!SLUG_PATTERN.test(normalized)) return null;
  return normalized;
}

describe("blogStats slug normalization", () => {
  it("accepts valid blog slugs", () => {
    expect(normalizeSlug("best-ai-tools-in-ghana-2026")).toBe("best-ai-tools-in-ghana-2026");
    expect(normalizeSlug("  AI-FOR-BECE  ")).toBe("ai-for-bece");
  });

  it("rejects invalid slugs", () => {
    expect(normalizeSlug("")).toBeNull();
    expect(normalizeSlug("../etc/passwd")).toBeNull();
    expect(normalizeSlug("slug with spaces")).toBeNull();
  });
});
