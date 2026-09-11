import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GEO_POSITIONING_STATEMENT, siteConfig } from "../../web/lib/site";
import { GIGAEDITS_PAGE } from "../../web/lib/seo/productPageContent";

describe("entity consistency (SEO trust)", () => {
  it("uses Ghana-built super-app positioning in GEO statement", () => {
    expect(GEO_POSITIONING_STATEMENT).toContain("Ghana-built");
    expect(GEO_POSITIONING_STATEMENT).toContain("GigaLearn");
    expect(GEO_POSITIONING_STATEMENT).not.toMatch(/enterprise voice/i);
    expect(GEO_POSITIONING_STATEMENT).not.toMatch(/codebase context/i);
    expect(GEO_POSITIONING_STATEMENT).not.toMatch(/customer.support agents/i);
  });

  it("aligns site tagline with official vision", () => {
    expect(siteConfig.tagline).toContain("Built in Africa");
  });

  it("gigaedits page metadata derives from product shell content", () => {
    const page = readFileSync(
      resolve(__dirname, "../../web/app/(marketing)/gigaedits/page.tsx"),
      "utf8"
    );
    expect(page).toContain("GIGAEDITS_PAGE.description");
    expect(page).not.toContain("AI Creator Tools");
    expect(GIGAEDITS_PAGE.whatItDoes).toContain("/gigaedit/");
  });

  it("robots.txt references only the sitemap index", () => {
    const robots = readFileSync(resolve(__dirname, "../../web/public/robots.txt"), "utf8");
    const sitemapLines = robots.match(/^Sitemap:/gm) ?? [];
    expect(sitemapLines).toHaveLength(1);
    expect(robots).toContain("Sitemap: https://www.giga3ai.com/sitemap.xml");
    expect(robots).not.toContain("sitemap-blog.xml");
  });
});
