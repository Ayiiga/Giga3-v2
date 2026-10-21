/**
 * Phase 2 — URL preservation and technical SEO guards.
 * Locks ranking-sensitive public URLs, sitemap hygiene, and safe redirects.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { RETIRED_PRODUCTS } from "../../web/lib/navigation/retiredProducts";
import { publicMetadata } from "../../web/lib/seo/publicMetadata";
import { siteConfig } from "../../web/lib/site";

const ROOT = resolve(__dirname, "../..");
const PUBLIC = join(ROOT, "web/public");

function readPublic(name: string): string {
  return readFileSync(join(PUBLIC, name), "utf8");
}

function allSitemapLocs(): string[] {
  const index = readPublic("sitemap.xml");
  const childUrls = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  const locs: string[] = [];
  for (const childUrl of childUrls) {
    expect(childUrl.startsWith("https://www.giga3ai.com/")).toBe(true);
    const childName = childUrl.slice("https://www.giga3ai.com/".length);
    const xml = readPublic(childName);
    locs.push(...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()));
  }
  return locs;
}

describe("Phase 2 URL preservation — site origin", () => {
  it("uses the production HTTPS www host as the canonical origin", () => {
    expect(siteConfig.url).toBe("https://www.giga3ai.com");
  });

  it("emits www HTTPS absolute Open Graph URLs from publicMetadata", () => {
    const meta = publicMetadata({
      path: "/features",
      title: "Features",
      description: "Giga3 AI features overview for students and creators in Ghana.",
    });
    expect(meta.openGraph?.url).toBe("https://www.giga3ai.com/features/");
    expect(meta.alternates?.canonical).toBe("/features/");
  });
});

describe("Phase 2 URL preservation — sitemaps", () => {
  it("lists only unique HTTPS www locs with trailing slashes", () => {
    const locs = allSitemapLocs();
    expect(locs.length).toBeGreaterThan(50);
    expect(new Set(locs).size).toBe(locs.length);
    for (const loc of locs) {
      expect(loc.startsWith("https://www.giga3ai.com/")).toBe(true);
      expect(loc.includes("?")).toBe(false);
      expect(loc.includes("#")).toBe(false);
      const path = loc.slice("https://www.giga3ai.com".length) || "/";
      if (path !== "/") expect(path.endsWith("/")).toBe(true);
    }
  });

  it("never lists retired create-product routes", () => {
    const locs = allSitemapLocs().join("\n");
    for (const product of RETIRED_PRODUCTS) {
      expect(locs).not.toContain(`https://www.giga3ai.com${product.path}/`);
    }
    expect(locs).not.toContain("https://www.giga3ai.com/video/plans/");
  });

  it("never lists private account prefixes", () => {
    const locs = allSitemapLocs();
    const privatePrefixes = [
      "/chat/",
      "/wallet/",
      "/credits/",
      "/settings/",
      "/profile/",
      "/subscribe/",
      "/admin/",
      "/api/",
      "/marketplace/sell/",
      "/marketplace/purchases/",
      "/payment/",
    ];
    for (const loc of locs) {
      const path = loc.slice("https://www.giga3ai.com".length) || "/";
      for (const prefix of privatePrefixes) {
        expect(path === prefix || path.startsWith(prefix)).toBe(false);
      }
    }
  });

  it("keeps ranking-sensitive public hubs in the sitemap set", () => {
    const locs = new Set(allSitemapLocs());
    for (const path of [
      "https://www.giga3ai.com/",
      "https://www.giga3ai.com/features/",
      "https://www.giga3ai.com/pricing/",
      "https://www.giga3ai.com/blog/",
      "https://www.giga3ai.com/ghana-ai/",
      "https://www.giga3ai.com/gigalearn/",
      "https://www.giga3ai.com/gigalearn/academy/",
      "https://www.giga3ai.com/gigalearn/exam/",
      "https://www.giga3ai.com/marketplace/",
      "https://www.giga3ai.com/gigasocial/",
      "https://www.giga3ai.com/documents/",
      "https://www.giga3ai.com/creator-studio/",
    ]) {
      expect(locs.has(path)).toBe(true);
    }
  });
});

describe("Phase 2 URL preservation — redirects", () => {
  const redirects = readPublic("_redirects");

  it("maps legacy /learn to GigaLearn, not the homepage", () => {
    expect(redirects).toMatch(/\/learn\/?\s+\/gigalearn\/\s+301/);
    expect(redirects).not.toMatch(/\/learn\/?\s+\/\s+301/);
  });

  it("preserves the coding-vs-ai blog slug alias to the published canonical", () => {
    expect(redirects).toContain(
      "/blog/coding-vs-ai-which-skill-should-beginners-learn-first/ /blog/coding-vs-ai-which-skill-beginners-learn-first/  301"
    );
  });

  it("does not mass-redirect retired products to the homepage", () => {
    for (const product of RETIRED_PRODUCTS) {
      const escaped = product.path.replace(/\//g, "\\/");
      expect(redirects).not.toMatch(new RegExp(`${escaped}\\/?\\s+/\\s+301`));
    }
  });

  it("does not rewrite unknown URLs to the homepage SPA shell", () => {
    expect(redirects).toMatch(/Unknown URLs must 404/i);
    expect(redirects).not.toMatch(/\/\*\s+\/index\.html\s+200/);
  });
});

describe("Phase 2 URL preservation — retired route metadata", () => {
  it("keeps dedicated product pages noindex soft-retire shells", () => {
    const marketingDir = join(ROOT, "web/app/(marketing)");
    const retiredFiles = [
      "media/page.tsx",
      "gigaedit/page.tsx",
      "gigaedits/page.tsx",
      "video/page.tsx",
      "video/plans/page.tsx",
      "ai-studio/page.tsx",
    ];
    for (const rel of retiredFiles) {
      const src = readFileSync(join(marketingDir, rel), "utf8");
      expect(src).toMatch(/index:\s*false/);
    }
  });
});

describe("Phase 2 URL preservation — robots.txt", () => {
  it("points at the sitemap index only and does not block public CSS/JS", () => {
    const robots = readPublic("robots.txt");
    const sitemapLines = robots.match(/^Sitemap:/gm) ?? [];
    expect(sitemapLines).toHaveLength(1);
    expect(robots).toContain("Sitemap: https://www.giga3ai.com/sitemap.xml");
    expect(robots).not.toMatch(/Disallow:\s*\/_next/i);
    expect(robots).not.toMatch(/Disallow:\s*\/assets/i);
    expect(robots).toContain("Disallow: /chat/");
    expect(robots).toContain("Allow: /");
  });
});

describe("Phase 2 URL preservation — blog slugs committed", () => {
  it("keeps published blog article modules under web/content/blog", () => {
    const blogDir = join(ROOT, "web/content/blog");
    const files = readdirSync(blogDir).filter((f) => f.endsWith(".tsx"));
    expect(files.length).toBeGreaterThan(10);
    expect(files).toContain("coding-vs-ai-which-skill-beginners-learn-first.tsx");
  });
});
