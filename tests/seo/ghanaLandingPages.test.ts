import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GHANA_LANDING_PAGES,
  GHANA_LANDING_PATHS,
} from "../../web/lib/seo/ghanaLandingPages";
import { FOOTER_PRODUCT_LINKS } from "../../web/lib/seo/productLinks";

describe("Ghana SEO landing pages", () => {
  it("defines six distinct audience paths", () => {
    expect(GHANA_LANDING_PATHS).toHaveLength(6);
    expect(new Set(GHANA_LANDING_PATHS).size).toBe(6);
  });

  for (const [key, config] of Object.entries(GHANA_LANDING_PAGES)) {
    it(`${key} page uses GhanaSeoLandingPage with matching FAQ JSON-LD`, () => {
      const pagePath = resolve(
        __dirname,
        `../../web/app/(marketing)${config.path}/page.tsx`
      );
      const src = readFileSync(pagePath, "utf8");
      expect(src).toContain("GhanaSeoLandingPage");
      expect(src).toContain("ghanaLandingMetadata");
      expect(config.faq.length).toBeGreaterThan(0);
    });

    it(`${key} avoids false government or ranking claims`, () => {
      const blob = JSON.stringify(config);
      expect(blob).not.toMatch(/official GES partner/i);
      expect(blob).not.toMatch(/Google recommends/i);
      expect(blob).not.toMatch(/best AI in Africa/i);
      expect(blob).not.toMatch(/guaranteed to pass/i);
      expect(blob).not.toMatch(/we guarantee/i);
    });
  }

  it("registers Ghana landing paths in footer product links", () => {
    const hrefs = FOOTER_PRODUCT_LINKS.map((l) => l.href);
    for (const path of [
      "/ai-for-teachers-ghana",
      "/ai-for-bece-wassce-ghana",
      "/african-ai-tools",
    ]) {
      expect(hrefs).toContain(path);
    }
  });

  it("lists Ghana landing routes in sitemap generator", () => {
    const sitemapScript = readFileSync(
      resolve(__dirname, "../../web/scripts/generate-public-seo-sitemap.mjs"),
      "utf8"
    );
    for (const path of GHANA_LANDING_PATHS) {
      expect(sitemapScript).toContain(`"${path}/"`);
    }
    expect(sitemapScript).toContain('"/chat/"');
    expect(sitemapScript).toContain("ensureRobotsSitemapIndex");
  });

  it("GhanaSeoLandingPage component is static (no use client)", () => {
    const src = readFileSync(
      resolve(__dirname, "../../web/components/seo/GhanaSeoLandingPage.tsx"),
      "utf8"
    );
    expect(src).not.toContain('"use client"');
    expect(src).toContain("JsonLd faq={config.faq}");
  });
});
