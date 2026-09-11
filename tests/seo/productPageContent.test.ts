import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AI_STUDIO_PAGE,
  ENTERPRISE_PAGE_SHELL,
  GIGAEDITS_PAGE,
  GIGALEARN_PAGE_SHELL,
  MEDIA_PAGE_SHELL,
  VIDEO_PAGE_SHELL,
} from "@/lib/seo/productPageContent";
import { SUBSCRIPTION_PLANS } from "@/lib/payments/subscriptionCatalog";

describe("productPageContent", () => {
  it("includes required SEO sections for thin product pages", () => {
    for (const page of [
      AI_STUDIO_PAGE,
      GIGAEDITS_PAGE,
      ENTERPRISE_PAGE_SHELL,
      VIDEO_PAGE_SHELL,
      MEDIA_PAGE_SHELL,
      GIGALEARN_PAGE_SHELL,
    ]) {
      expect(page.whatItDoes.length).toBeGreaterThan(20);
      expect(page.whoFor.length).toBeGreaterThanOrEqual(2);
      expect(page.capabilities.length).toBeGreaterThanOrEqual(2);
      expect(page.giga3Connection.length).toBeGreaterThan(20);
      expect(page.primaryHref.startsWith("/")).toBe(true);
    }
  });

  it("routes GigaEdits landing to the GigaEdit editor", () => {
    expect(GIGAEDITS_PAGE.primaryHref).toBe("/gigaedit");
  });

  it("routes AI Studio umbrella to Media Studio", () => {
    expect(AI_STUDIO_PAGE.primaryHref).toBe("/media");
    expect(AI_STUDIO_PAGE.secondaryHref).toBe("/video");
  });

  it("routes media and gigalearn shells to their apps", () => {
    expect(MEDIA_PAGE_SHELL.primaryHref).toBe("/media");
    expect(GIGALEARN_PAGE_SHELL.primaryHref).toBe("/gigalearn");
  });

  it("uses PublicProductPageShell on media and gigalearn pages", () => {
    const media = readFileSync(
      resolve(__dirname, "../../web/app/(marketing)/media/page.tsx"),
      "utf8"
    );
    const gigalearn = readFileSync(
      resolve(__dirname, "../../web/app/(marketing)/gigalearn/page.tsx"),
      "utf8"
    );
    expect(media).toContain("PublicProductPageShell");
    expect(media).toContain("ClientAppHydrationNotice");
    expect(gigalearn).toContain("PublicProductPageShell");
    expect(gigalearn).not.toMatch(/Loading…/);
  });
});

describe("pricing consistency with subscription catalog", () => {
  it("uses the same Pro plan amounts everywhere in marketing helpers", () => {
    expect(SUBSCRIPTION_PLANS.pro.priceGhs).toBe(150);
    expect(SUBSCRIPTION_PLANS.pro.credits).toBe(250);
    expect(SUBSCRIPTION_PLANS.basic.priceGhs).toBe(60);
    expect(SUBSCRIPTION_PLANS.premium.priceGhs).toBe(350);
  });
});
