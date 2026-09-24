import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  apexToWwwRedirect,
  canonicalLoc,
  changedPublicUrls,
  isPrivatePath,
  robotsTxt,
} from "../../web/scripts/seo-route-policy.mjs";

const root = resolve(__dirname, "../..");

describe("robots and private routes", () => {
  it("allows public pages, blocks account routes, and lists one sitemap", () => {
    const robots = robotsTxt();
    expect(robots).toContain("Allow: /");
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toContain("Disallow: /admin/");
    expect(robots).toContain("Disallow: /chat/");
    expect(robots).toContain("Disallow: /wallet/");
    expect(robots.match(/^Sitemap:/gm)).toHaveLength(1);
    expect(robots).toContain("Sitemap: https://www.giga3ai.com/sitemap.xml");
    expect(robots).not.toContain("sitemap-index.xml");
    expect(robots).not.toContain("Disallow: /blog");
    expect(robots).not.toContain("Disallow: /pricing");
  });

  it("keeps the committed robots.txt aligned with the policy", () => {
    const robots = readFileSync(resolve(root, "web/public/robots.txt"), "utf8");
    expect(robots).toBe(robotsTxt());
  });
});

describe("sitemap URL policy", () => {
  it("rejects private, query, and off-host URLs", () => {
    expect(isPrivatePath("/chat/")).toBe(true);
    expect(isPrivatePath("/wallet/")).toBe(true);
    expect(isPrivatePath("/marketplace/sell/")).toBe(true);
    expect(isPrivatePath("/pricing/")).toBe(false);
    expect(canonicalLoc("https://www.giga3ai.com/pricing")).toBe("https://www.giga3ai.com/pricing/");
    expect(canonicalLoc("https://www.giga3ai.com/chat/")).toBeNull();
    expect(canonicalLoc("https://www.giga3ai.com/pricing/?plan=pro")).toBeNull();
    expect(canonicalLoc("https://example.com/pricing/")).toBeNull();
  });

  it("does not list private routes in the static sitemap", () => {
    const xml = readFileSync(resolve(root, "web/public/sitemap-static.xml"), "utf8");
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    expect(new Set(locs).size).toBe(locs.length);
    for (const loc of locs) {
      expect(loc.startsWith("https://www.giga3ai.com/")).toBe(true);
      expect(loc.endsWith("/")).toBe(true);
      expect(loc).not.toContain("/chat/");
      expect(loc).not.toContain("/wallet/");
      expect(loc).not.toContain("/admin/");
      expect(loc).not.toContain("/api/");
      expect(canonicalLoc(loc)).toBe(loc);
    }
  });
});

describe("IndexNow diff", () => {
  it("submits only changed public URLs", () => {
    const before = new Map([
      ["https://www.giga3ai.com/pricing/", "2026-09-01"],
      ["https://www.giga3ai.com/blog/post/", "2026-09-01"],
      ["https://www.giga3ai.com/wallet/", "2026-09-01"],
    ]);
    const after = new Map([
      ["https://www.giga3ai.com/pricing/", "2026-09-01"],
      ["https://www.giga3ai.com/about/", "2026-09-18"],
      ["https://www.giga3ai.com/chat/", "2026-09-18"],
    ]);
    expect(changedPublicUrls(before, after).sort()).toEqual([
      "https://www.giga3ai.com/about/",
      "https://www.giga3ai.com/blog/post/",
    ]);
  });
});

describe("canonical host redirect", () => {
  it("sends the apex host to www over https and leaves www alone", () => {
    expect(apexToWwwRedirect("https://giga3ai.com/pricing/")).toBe(
      "https://www.giga3ai.com/pricing/"
    );
    expect(apexToWwwRedirect("http://giga3ai.com/blog/post/?x=1")).toBe(
      "https://www.giga3ai.com/blog/post/?x=1"
    );
    expect(apexToWwwRedirect("https://www.giga3ai.com/pricing/")).toBeNull();
  });

  it("is applied by the Pages middleware before other handling", () => {
    const src = readFileSync(resolve(root, "web/functions/_middleware.js"), "utf8");
    expect(src).toContain("apexToWwwRedirect");
    expect(src.indexOf("apexToWwwRedirect")).toBeLessThan(src.indexOf("isGigaSocialPostPath"));
  });
});

describe("404 and homepage structured data", () => {
  it("marks the not-found page noindex and does not canonicalize it to the homepage", () => {
    const src = readFileSync(resolve(root, "web/app/not-found.tsx"), "utf8");
    expect(src).toContain("index: false");
    expect(src).toContain('canonical: "/404.html"');
  });

  it("emits WebSite, Organization, and SoftwareApplication markup on the homepage", () => {
    const src = readFileSync(resolve(root, "web/app/(marketing)/page.tsx"), "utf8");
    expect(src).toContain('type="WebSite"');
    expect(src).toContain('type="Organization"');
    expect(src).toContain("offers={HOME_OFFERS}");
    const jsonLd = readFileSync(resolve(root, "web/components/seo/JsonLd.tsx"), "utf8");
    expect(jsonLd).not.toContain("aggregateRating");
    expect(jsonLd).not.toContain("reviewCount");
  });

  it("marks blog posts as Article and BlogPosting with breadcrumbs", () => {
    const src = readFileSync(resolve(root, "web/components/blog/BlogArticleJsonLd.tsx"), "utf8");
    expect(src).toContain('"Article"');
    expect(src).toContain('"BlogPosting"');
    expect(src).toContain("BreadcrumbList");
  });
});
