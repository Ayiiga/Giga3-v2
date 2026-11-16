import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  isListingFileApproved,
  isMarketplaceListingVisible,
  isPhysicalMarketplaceListing,
} from "../../convex/marketplaceListingHelpers";
import { listingMatchesCollection } from "../../web/lib/marketplace/discovery";

const physical = {
  productType: "physical_item",
  status: "published",
  tags: [],
  fileStorageId: "unexpected-pdf",
  fileReviewStatus: "approved",
  coverStorageId: "real-product-photo",
  stockQuantity: 2,
} as any;

describe("physical listings never enter digital PDF/Paystack sales", () => {
  it("keeps existing approved digital file checkout eligible", () => {
    expect(isListingFileApproved({
      productType: "ebook", tags: [], fileStorageId: "pdf-1", fileReviewStatus: "approved"
    } as any)).toBe(true);
  });

  it("refuses digital entitlements for physical items even with a PDF accidentally attached", () => {
    expect(isPhysicalMarketplaceListing(physical)).toBe(true);
    expect(isListingFileApproved(physical)).toBe(false);
    expect(isMarketplaceListingVisible(physical)).toBe(true);
  });

  it("requires a photo and available stock; drafts never appear", () => {
    expect(isMarketplaceListingVisible({ ...physical, coverStorageId: undefined, coverImageUrl: undefined })).toBe(false);
    expect(isMarketplaceListingVisible({ ...physical, stockQuantity: 0 })).toBe(false);
    expect(isMarketplaceListingVisible({ ...physical, status: "draft" })).toBe(false);
  });

  it("keeps physical goods separate from education and digital templates", () => {
    const clothes = { category: "Clothing", productType: "physical_item" };
    expect(listingMatchesCollection(clothes, "physical-goods")).toBe(true);
    expect(listingMatchesCollection(clothes, "ebooks-learning")).toBe(false);
  });

  it("guards the server checkout and upload paths, not just the buttons", () => {
    const market = readFileSync(resolve(__dirname, "../../convex/marketplace.ts"), "utf8");
    const upload = readFileSync(resolve(__dirname, "../../convex/marketplaceUploadIntents.ts"), "utf8");
    const details = readFileSync(resolve(__dirname, "../../web/components/marketplace/MarketplaceItemClient.tsx"), "utf8");
    expect(market).toContain('|| isPhysicalMarketplaceListing(listing)) return null;');
    expect(upload).toContain('listing.productType === "physical_item" && args.purpose === "product_file"');
    expect(details).toContain("Request availability");
    expect(details).toContain("No payment is taken");
  });
});
