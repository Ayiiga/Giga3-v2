import { describe, expect, it } from "vitest";
import { formatBlogViewLabel } from "@/lib/blog/viewStats";

describe("formatBlogViewLabel", () => {
  it("uses singular copy for one view", () => {
    expect(formatBlogViewLabel(1)).toBe("1 view");
  });

  it("uses plural copy for multiple views", () => {
    expect(formatBlogViewLabel(42)).toBe("42 views");
  });

  it("never shows negative counts", () => {
    expect(formatBlogViewLabel(-3)).toBe("0 views");
  });
});
