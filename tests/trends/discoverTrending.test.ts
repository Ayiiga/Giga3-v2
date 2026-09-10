import { describe, expect, it } from "vitest";
import { DISCOVER_ITEMS } from "@/lib/trends/discoverCatalog";
import { TREND_CATEGORIES } from "@/lib/trends/categories";

describe("discover/trending static shells", () => {
  it("exposes curated discover items without fake metrics", () => {
    expect(DISCOVER_ITEMS.length).toBeGreaterThanOrEqual(8);
    for (const item of DISCOVER_ITEMS) {
      expect(item.href.startsWith("/")).toBe(true);
      expect(item.title.length).toBeGreaterThan(0);
    }
  });

  it("lists honest static trend categories", () => {
    expect(TREND_CATEGORIES.length).toBeGreaterThanOrEqual(6);
    for (const category of TREND_CATEGORIES) {
      expect(category.href.startsWith("/")).toBe(true);
      expect(category.label.length).toBeGreaterThan(0);
    }
  });
});
