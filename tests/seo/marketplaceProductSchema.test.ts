import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildMarketplaceProductJsonLd,
  isExcludedMarketplaceSeoListing,
} from "../../web/lib/seo/marketplaceProductSchema";

describe("isExcludedMarketplaceSeoListing", () => {
  it("excludes E2E / QA fixture titles and creators", () => {
    expect(isExcludedMarketplaceSeoListing({ title: "E2E Test eBook" })).toBe(true);
    expect(isExcludedMarketplaceSeoListing({ creatorName: "E2E Creator" })).toBe(true);
    expect(isExcludedMarketplaceSeoListing({ creatorHandle: "e2e-bot" })).toBe(true);
    expect(isExcludedMarketplaceSeoListing({ title: "QA Test pack" })).toBe(true);
  });

  it("keeps genuine marketplace titles", () => {
    expect(
      isExcludedMarketplaceSeoListing({
        title: "From Idea to App: How to Build a Website",
        creatorName: "Giga3 Studio",
      })
    ).toBe(false);
    expect(isExcludedMarketplaceSeoListing({ title: "Ultimate Productivity eBook" })).toBe(false);
  });
});

describe("buildMarketplaceProductJsonLd", () => {
  const base = {
    listingId: "listing123",
    title: "Ultimate Productivity eBook",
    description: "A practical ebook for Ghanaian professionals.",
    priceGhs: 25,
    url: "https://www.giga3ai.com/marketplace/item/listing123/",
    image: "https://www.giga3ai.com/images/logo.png",
    category: "ebook",
    creatorName: "Giga3 Studio",
  };

  it("emits Product + Offer without inventing review or aggregateRating", () => {
    const payload = buildMarketplaceProductJsonLd(base);
    expect(payload["@type"]).toBe("Product");
    expect(payload.offers).toMatchObject({
      "@type": "Offer",
      priceCurrency: "GHS",
      price: "25.00",
    });
    expect(payload).not.toHaveProperty("review");
    expect(payload).not.toHaveProperty("aggregateRating");
  });

  it("adds review + aggregateRating only for genuine review rows", () => {
    const payload = buildMarketplaceProductJsonLd({
      ...base,
      reviews: [
        { rating: 5, comment: "Clear and useful.", createdAt: Date.UTC(2026, 0, 15) },
        { rating: 4, createdAt: Date.UTC(2026, 1, 1) },
      ],
    });
    expect(payload.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: 4.5,
      reviewCount: 2,
      ratingCount: 2,
      bestRating: 5,
      worstRating: 1,
    });
    expect(Array.isArray(payload.review)).toBe(true);
    const reviews = payload.review as Array<Record<string, unknown>>;
    expect(reviews).toHaveLength(2);
    expect(reviews[0]).toMatchObject({
      "@type": "Review",
      reviewBody: "Clear and useful.",
      reviewRating: { "@type": "Rating", ratingValue: 5 },
    });
    expect(reviews[1]).not.toHaveProperty("reviewBody");
  });

  it("ignores out-of-range ratings instead of inventing scores", () => {
    const payload = buildMarketplaceProductJsonLd({
      ...base,
      reviews: [{ rating: 0, createdAt: 1 }, { rating: 9, createdAt: 2 }],
    });
    expect(payload).not.toHaveProperty("review");
    expect(payload).not.toHaveProperty("aggregateRating");
  });
});

describe("marketplace item page Product wiring", () => {
  it("uses shared schema helper and skips Product JSON-LD for excluded fixtures", () => {
    const page = readFileSync(
      resolve(__dirname, "../../web/app/(marketing)/marketplace/item/[listingId]/page.tsx"),
      "utf8"
    );
    expect(page).toContain("MarketplaceProductJsonLd");
    expect(page).toContain("isExcludedMarketplaceSeoListing");
    expect(page).toContain("indexable ? (");
    expect(page).toContain("reviews={reviews}");
    expect(page).toContain('aria-label="Customer reviews"');
  });

  it("does not hardcode fake star ratings in DynamicPublicJsonLd", () => {
    const src = readFileSync(
      resolve(__dirname, "../../web/components/seo/DynamicPublicJsonLd.tsx"),
      "utf8"
    );
    expect(src).toContain("buildMarketplaceProductJsonLd");
    expect(src).not.toMatch(/ratingValue:\s*[1-5](\.0)?\s*,/);
    expect(src).not.toContain("reviewCount: 10");
  });
});
