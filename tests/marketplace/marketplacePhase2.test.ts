import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  analyticsRangePreset,
  filterSalesByRange,
  productSalesSummaries,
  summarizeSales,
} from "../../web/lib/marketplace/salesAnalytics";
import { CREATOR_SERIES, CREATOR_SERIES_PRICE_GHS } from "../../web/lib/marketplace/creatorSeries";

const marketplaceSrc = readFileSync(
  resolve(__dirname, "../../convex/marketplace.ts"),
  "utf8"
);

describe("marketplace Phase 2 sales analytics helpers", () => {
  const sales = [
    {
      listingId: "a",
      amountGhs: 100,
      platformFeeGhs: 15,
      creatorEarningsGhs: 85,
      createdAt: 1_000,
    },
    {
      listingId: "a",
      amountGhs: 50,
      platformFeeGhs: 8,
      creatorEarningsGhs: 42,
      createdAt: 2_000,
    },
    {
      listingId: "b",
      amountGhs: 200,
      platformFeeGhs: 30,
      creatorEarningsGhs: 170,
      createdAt: 3_000,
    },
  ];

  it("summarizes gross, fees, and earnings without double-counting", () => {
    expect(summarizeSales(sales)).toEqual({
      grossSalesGhs: 350,
      purchaseCount: 3,
      platformFeesGhs: 53,
      creatorEarningsGhs: 297,
    });
  });

  it("filters by date range", () => {
    expect(filterSalesByRange(sales, 1_500, 2_500)).toHaveLength(1);
    expect(filterSalesByRange(sales, 0, 500)).toHaveLength(0);
  });

  it("aggregates product-level summaries", () => {
    const rows = productSalesSummaries(sales);
    expect(rows[0]?.listingId).toBe("b");
    expect(rows.find((r) => r.listingId === "a")?.purchaseCount).toBe(2);
  });

  it("builds analytics range presets", () => {
    expect(analyticsRangePreset("all")).toEqual({});
    const r = analyticsRangePreset("7d");
    expect(r.fromMs).toBeLessThan(r.toMs!);
  });

  it("floors range endpoints to the minute so useQuery args stay stable", () => {
    const a = analyticsRangePreset("30d", 1_700_000_123_456);
    const b = analyticsRangePreset("30d", 1_700_000_123_999);
    expect(a).toEqual(b);
    expect(a.toMs! % 60_000).toBe(0);
    expect(a.fromMs).toBe(a.toMs! - 30 * 24 * 60 * 60 * 1000);
  });
});

describe("marketplace sell client — analytics query stability", () => {
  it("memoizes analyticsRangePreset by preset (avoids React #301 re-render loop)", () => {
    const sell = readFileSync(
      resolve(__dirname, "../../web/components/marketplace/MarketplaceSellClient.tsx"),
      "utf8"
    );
    expect(sell).toContain("useMemo");
    expect(sell).toMatch(
      /analyticsRangePreset\(analyticsPreset\)[\s\S]*?\[analyticsPreset\]/
    );
    expect(sell).not.toMatch(
      /const analyticsRange = analyticsRangePreset\(analyticsPreset\);/
    );
  });
});

describe("marketplace Phase 2 Convex storefront + analytics", () => {
  it("exposes public storefront query without storage IDs", () => {
    const block =
      marketplaceSrc.match(/export const listPublishedByHandle = query\([\s\S]*?\n}\);/)?.[0] ??
      "";
    expect(block).toContain("toPublicListingResolved");
    expect(block).toContain("toPublicCreatorProfile(profile)");
    expect(block).toContain('eq("status", "published")');
    expect(block).toContain("isListingFileApproved");
  });

  it("sales analytics strips buyer identity and discloses refund limits", () => {
    const block =
      marketplaceSrc.match(
        /export const getCreatorSalesAnalytics = query\([\s\S]*?\n}\);/
      )?.[0] ?? "";
    expect(block).toContain("refundsSupported: false");
    expect(block).toContain("automatedPayouts: false");
    expect(block).not.toContain("buyerId:");
    expect(block).toContain("productSummaries");
  });

  it("getCreatorRevenue no longer returns raw buyerId on sales", () => {
    const block =
      marketplaceSrc.match(/export const getCreatorRevenue = query\([\s\S]*?\n}\);/)?.[0] ?? "";
    expect(block).toContain("sales.map((sale) => ({");
    expect(block).toContain("toSellerRevenueProfile(profile)");
    expect(block).not.toMatch(/buyerId:\s*sale\.buyerId/);
  });

  it("updateListing enforces ownership before patch", () => {
    const block =
      marketplaceSrc.match(/export const updateListing = mutation\([\s\S]*?\n}\);/)?.[0] ?? "";
    expect(block).toContain("listing.creatorId !== email");
    expect(block).toContain("Approved verification is required before publishing.");
  });
});

describe("marketplace Phase 2 UI wiring", () => {
  it("storefront client uses listPublishedByHandle", () => {
    const src = readFileSync(
      resolve(__dirname, "../../web/components/marketplace/CreatorStorefrontClient.tsx"),
      "utf8"
    );
    expect(src).toContain("listPublishedByHandle");
    expect(src).toContain("Share storefront");
    expect(src).toContain("ProductCover");
    expect(src).not.toContain("nationalId");
    expect(src).not.toContain("fileStorageId");
  });

  it("seller dashboard wires analytics + edit ownership UI", () => {
    const src = readFileSync(
      resolve(__dirname, "../../web/components/marketplace/MarketplaceSellClient.tsx"),
      "utf8"
    );
    expect(src).toContain("getCreatorSalesAnalytics");
    expect(src).toContain("Sales analytics");
    expect(src).toContain("beginEdit");
    expect(src).toContain("Unpublish");
    expect(src).toContain("Preview");
  });
});

describe("Phase 1 + GigaLearn preservation", () => {
  it("keeps Creator Academy four eBooks at GHS 150", () => {
    expect(CREATOR_SERIES).toHaveLength(4);
    expect(CREATOR_SERIES_PRICE_GHS).toBe(150);
  });

  it("browse still uses ProductCover and discovery collections", () => {
    const browse = readFileSync(
      resolve(__dirname, "../../web/components/marketplace/MarketplaceBrowseClient.tsx"),
      "utf8"
    );
    expect(browse).toContain("ProductCover");
    expect(browse).toContain("DISCOVERY_COLLECTIONS");
    expect(browse).toContain("CreatorAcademySection");
  });

  it("GigaLearn academy route remains distinct", () => {
    const src = readFileSync(
      resolve(__dirname, "../../web/components/gigalearn/academy/AcademyChrome.tsx"),
      "utf8"
    );
    expect(src).toContain("GigaLearn");
    expect(src).not.toContain("CreatorAcademySection");
  });
});
