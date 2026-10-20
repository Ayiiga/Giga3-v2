import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  EDUCATION_FIRST_DESTINATIONS,
  getRetiredProduct,
  isRetiredProductPath,
  RETIRED_PRODUCTS,
} from "../../web/lib/navigation/retiredProducts";
import { PRIMARY_NAV_TABS } from "../../web/lib/navigation/primaryNav";
import { navLinks } from "../../web/lib/site";

describe("retiredProducts", () => {
  it("lists Media Studio, Video AI, GigaEdit(s), and AI Studio as retired", () => {
    expect(RETIRED_PRODUCTS.map((p) => p.id).sort()).toEqual(
      ["ai-studio", "gigaedit", "gigaedits", "media", "video"].sort()
    );
  });

  it("matches nested retired paths", () => {
    expect(isRetiredProductPath("/media")).toBe(true);
    expect(isRetiredProductPath("/media/?tab=image")).toBe(true);
    expect(isRetiredProductPath("/video/plans")).toBe(true);
    expect(getRetiredProduct("/gigaedits/")?.id).toBe("gigaedits");
    expect(isRetiredProductPath("/chat")).toBe(false);
  });

  it("exposes education-first destinations on retirement pages", () => {
    const hrefs = EDUCATION_FIRST_DESTINATIONS.map((d) => d.href);
    expect(hrefs).toContain("/gigalearn/academy/");
    expect(hrefs).toContain("/gigalearn/exam/");
    expect(hrefs).toContain("/chat/");
    expect(hrefs).toContain("/gigalearn/academy/tech/");
    expect(hrefs).toContain("/gigasocial/");
    expect(hrefs).toContain("/marketplace/");
  });

  it("keeps primary nav free of retired product hrefs", () => {
    for (const tab of PRIMARY_NAV_TABS) {
      expect(isRetiredProductPath(tab.href)).toBe(false);
    }
  });

  it("keeps marketing navLinks free of retired product hrefs", () => {
    for (const link of navLinks) {
      expect(isRetiredProductPath(link.href)).toBe(false);
    }
  });

  it("soft-retires marketing pages with RetiredProductNotice", () => {
    for (const file of [
      "web/app/(marketing)/media/page.tsx",
      "web/app/(marketing)/video/page.tsx",
      "web/app/(marketing)/video/plans/page.tsx",
      "web/app/(marketing)/gigaedit/page.tsx",
      "web/app/(marketing)/gigaedits/page.tsx",
      "web/app/(marketing)/ai-studio/page.tsx",
    ]) {
      const src = readFileSync(resolve(__dirname, "../..", file), "utf8");
      expect(src).toMatch(/RetiredProductNotice|MediaRetiredGate|GigaEditRetiredGate/);
      expect(src).toContain("index: false");
    }
  });
});
