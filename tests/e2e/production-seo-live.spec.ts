import { expect, test } from "@playwright/test";

const SITE = "https://www.giga3ai.com";

test.describe("Production — SEO & indexability (technical readiness only)", () => {
  test("robots.txt is reachable and references sitemap", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body.toLowerCase()).toContain("user-agent:");
    expect(body).toContain(`${SITE}/sitemap.xml`);
    expect(body.toLowerCase()).toMatch(/disallow:\s*\/chat\//);
  });

  test("sitemap index is reachable with child sitemaps", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();
    expect(xml).toContain("<sitemapindex");
    expect(xml).toContain(`${SITE}/sitemap-static.xml`);
    expect(xml).toContain(`${SITE}/sitemap-blog.xml`);
  });

  test("sample public pages have valid canonical URLs and JSON-LD where expected", async ({
    page,
  }) => {
    for (const path of ["/", "/pricing/", "/gigalearn/", "/blog/"]) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${path} HTTP status`).toBe(200);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(canonical, `${path} canonical`).toMatch(/^https:\/\/www\.giga3ai\.com\//);

      const jsonLd = page.locator('script[type="application/ld+json"]');
      expect(await jsonLd.count(), `${path} JSON-LD blocks`).toBeGreaterThan(0);

      for (let i = 0; i < (await jsonLd.count()); i += 1) {
        const raw = (await jsonLd.nth(i).textContent())?.trim() ?? "";
        expect(() => JSON.parse(raw), `${path} JSON-LD parse`).not.toThrow();
      }
    }
  });

  test("private chat route remains noindex in production HTML", async ({ page }) => {
    await page.goto("/chat/");
    const robots = await page.locator('meta[name="robots"]').getAttribute("content");
    expect((robots ?? "").toLowerCase()).toContain("noindex");
  });

  test("Google Search Console verification — NOT TESTED without supplied tokens", async () => {
    test.skip(
      !process.env.GIGA3_GOOGLE_SITE_VERIFICATION?.trim(),
      "NOT TESTED: Google Search Console verification requires GIGA3_GOOGLE_SITE_VERIFICATION secret."
    );
  });

  test("Bing Webmaster verification — NOT TESTED without supplied tokens", async () => {
    test.skip(
      !process.env.GIGA3_BING_SITE_VERIFICATION?.trim(),
      "NOT TESTED: Bing Webmaster verification requires GIGA3_BING_SITE_VERIFICATION secret."
    );
  });
});
