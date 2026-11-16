import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  marketplaceItemPath,
  marketplacePhysicalItemPath,
  marketplacePhysicalItemUrl,
} from "../../web/lib/seo/publicPaths";
import { parseMarketplaceListingId } from "../../web/lib/marketplace/listingRoute";

describe("marketplace physical item links work between static exports", () => {
  it("keeps digital canonical paths and gives new physical items a stable query URL", () => {
    expect(marketplaceItemPath("abc123")).toBe("/marketplace/item/abc123/");
    expect(marketplacePhysicalItemPath("abc123")).toBe("/marketplace/item/?id=abc123");
    expect(marketplacePhysicalItemUrl("abc123")).toMatch(/giga3ai\.com\/marketplace\/item\/\?id=abc123$/);
    expect(parseMarketplaceListingId("/marketplace/item/", "id=abc123")).toBe("abc123");
  });
  it("uses the query fallback only for physical items in browse and product sharing", () => {
    const browse = readFileSync(resolve(__dirname, "../../web/components/marketplace/MarketplaceBrowseClient.tsx"), "utf8");
    const share = readFileSync(resolve(__dirname, "../../web/components/marketplace/ProductPromotionPanel.tsx"), "utf8");
    expect(browse).toContain('item.productType === "physical_item" ? marketplacePhysicalItemPath(item._id)');
    expect(share).toContain('listing.productType === "physical_item" ? marketplacePhysicalItemUrl(listing._id)');
    expect(share).toContain("marketplaceItemUrl(listing._id)");
  });
});
