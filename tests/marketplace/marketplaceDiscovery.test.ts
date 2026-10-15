import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CREATOR_SERIES,
  CREATOR_SERIES_PRICE_GHS,
} from "../../web/lib/marketplace/creatorSeries";
import {
  DISCOVERY_COLLECTIONS,
  PRICE_FILTERS,
  listingMatchesCollection,
  listingMatchesPrice,
} from "../../web/lib/marketplace/discovery";

describe("marketplace discovery collections", () => {
  it("defines the six Phase 1 discovery collections", () => {
    expect(DISCOVERY_COLLECTIONS.map((c) => c.id)).toEqual([
      "ebooks-learning",
      "courses-training",
      "ai-prompts",
      "design-templates",
      "software-dev",
      "creator-resources",
    ]);
  });

  it("matches listings by category or product type (OR)", () => {
    expect(
      listingMatchesCollection(
        { category: "Education", productType: "other" },
        "ebooks-learning"
      )
    ).toBe(true);
    expect(
      listingMatchesCollection(
        { category: "Business", productType: "ai_prompt" },
        "ai-prompts"
      )
    ).toBe(true);
    expect(
      listingMatchesCollection(
        { category: "Faith & Inspiration", productType: "sermon" },
        "software-dev"
      )
    ).toBe(false);
  });

  it("supports price filter bounds", () => {
    expect(listingMatchesPrice(15, undefined, 20)).toBe(true);
    expect(listingMatchesPrice(25, undefined, 20)).toBe(false);
    expect(listingMatchesPrice(150, 100, 200)).toBe(true);
    expect(listingMatchesPrice(250, 200, undefined)).toBe(true);
    expect(PRICE_FILTERS.length).toBeGreaterThanOrEqual(4);
  });
});

describe("marketplace browse discovery UI", () => {
  it("wires ProductCover, discovery collections, and price filters", () => {
    const browse = readFileSync(
      resolve(__dirname, "../../web/components/marketplace/MarketplaceBrowseClient.tsx"),
      "utf8"
    );
    expect(browse).toContain("ProductCover");
    expect(browse).toContain("DISCOVERY_COLLECTIONS");
    expect(browse).toContain("PRICE_FILTERS");
    expect(browse).toContain("listingMatchesCollection");
    expect(browse).toContain("listingMatchesPrice");
    expect(browse).toContain("Load more");
    expect(browse).toContain("verifiedOnly");
    // Stay compatible with currently deployed Convex validators until this PR deploys.
    expect(browse).not.toContain("categoriesAny");
    expect(browse).not.toContain("offset:");
    expect(browse).not.toContain("PRODUCT_TYPES");
  });

  it("uses meaningful cover fallbacks on browse, item, and purchases", () => {
    const cover = readFileSync(
      resolve(__dirname, "../../web/components/marketplace/ProductCover.tsx"),
      "utf8"
    );
    expect(cover).toContain("onError");
    expect(cover).toContain("cover placeholder");
    expect(cover).toContain("aspect-[4/5]");

    for (const rel of [
      "MarketplaceBrowseClient.tsx",
      "MarketplaceItemClient.tsx",
      "MarketplacePurchasesClient.tsx",
    ]) {
      const src = readFileSync(
        resolve(__dirname, `../../web/components/marketplace/${rel}`),
        "utf8"
      );
      expect(src).toContain("ProductCover");
    }
  });
});

describe("Creator Academy preservation", () => {
  it("keeps four official eBooks at GHS 150", () => {
    expect(CREATOR_SERIES).toHaveLength(4);
    expect(CREATOR_SERIES_PRICE_GHS).toBe(150);
    for (const series of CREATOR_SERIES) {
      expect(series.productType).toBe("ebook");
      expect(series.listingTag).toMatch(/^giga3-series-/);
    }
  });

  it("searchListings uses OR for discovery category/type arrays", () => {
    const source = readFileSync(resolve(__dirname, "../../convex/marketplace.ts"), "utf8");
    expect(source).toContain("catSet.has(r.category) || typeSet.has(r.productType)");
    expect(source).toContain("categoriesAny");
    expect(source).toContain("productTypesAny");
    expect(source).toContain("minPriceGhs");
    expect(source).toContain("offset");
  });

  it("buyer library strips private storage ids from listing payloads", () => {
    const source = readFileSync(resolve(__dirname, "../../convex/marketplace.ts"), "utf8");
    const block =
      source.match(/export const getMyPurchases = query\([\s\S]*?\n}\);/)?.[0] ?? "";
    expect(block).toContain("toPublicListing(listing)");
    expect(block).toContain("downloadPendingReview");
    // Purchase summary is a whitelist — no raw Doc dump / buyerId / seller email.
    expect(block).toContain("paymentReference: purchase.paymentReference");
    expect(block).not.toMatch(/purchase,\s*\n\s*listing,/);
    expect(block).not.toContain("buyerId: purchase.buyerId");
  });

  it("searchListings and getListing return toPublicListing (no raw storage id)", () => {
    const source = readFileSync(resolve(__dirname, "../../convex/marketplace.ts"), "utf8");
    const search = source.match(/export const searchListings = query\([\s\S]*?\n}\);/)?.[0] ?? "";
    const get = source.match(/export const getListing = query\([\s\S]*?\n}\);/)?.[0] ?? "";
    expect(search).toContain("toPublicListing(listing)");
    expect(get).toContain("toPublicListing(listing)");
    expect(get).toContain("toPublicCreatorProfile");
    expect(get).toContain("toPublicReview");
  });
});
