import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SIMPLE_CATEGORIES,
  SIMPLE_LICENSE_TYPES,
  SIMPLE_PRODUCT_TYPES,
} from "../../web/lib/marketplace/catalog";

describe("marketplace simple catalog", () => {
  it("keeps seller UI to a small product and license set", () => {
    expect(SIMPLE_PRODUCT_TYPES.length).toBeLessThanOrEqual(6);
    expect(SIMPLE_LICENSE_TYPES.map((l) => l.id)).toEqual(["personal", "commercial"]);
    expect(SIMPLE_CATEGORIES.length).toBeLessThanOrEqual(6);
  });
});

describe("marketplace fraud gates", () => {
  it("requires approved verification before publishing", () => {
    const source = readFileSync(resolve(__dirname, "../../convex/marketplace.ts"), "utf8");
    expect(source).toContain("Save as draft first. Attach a PDF and wait for admin approval before publishing.");
    expect(source).toContain("Approved verification is required before publishing.");
    expect(source).toContain("Attach a product file before publishing.");
    expect(source).toContain("Wait for admin approval of your PDF before publishing.");
  });

  it("allows text-only listing edits without the product upload gate", () => {
    const source = readFileSync(resolve(__dirname, "../../convex/marketplace.ts"), "utf8");
    const updateBlock = source.match(/export const updateListing = mutation\([\s\S]*?\n}\);/)?.[0] ?? "";
    expect(updateBlock).not.toContain("assertMarketplaceUploadsEnabled");
  });

  it("counts views only for signed-in users", () => {
    const source = readFileSync(resolve(__dirname, "../../convex/marketplace.ts"), "utf8");
    expect(source).toMatch(/recordView[\s\S]*sessionToken: v\.optional\(v\.string\(\)\)/);
    expect(source).toContain("if (!args.sessionToken) return;");
  });

  it("exposes verification uploads separate from seller product uploads", () => {
    const profiles = readFileSync(resolve(__dirname, "../../convex/creatorProfiles.ts"), "utf8");
    expect(profiles).toContain("generateVerificationUploadUrl");
    expect(profiles).not.toMatch(
      /generateVerificationUploadUrl[\s\S]*assertMarketplaceUploadsEnabled/
    );
  });
});

describe("marketplace simple UI", () => {
  it("browse page uses verified-only filter and drops heavy product-type filter", () => {
    const browse = readFileSync(
      resolve(__dirname, "../../web/components/marketplace/MarketplaceBrowseClient.tsx"),
      "utf8"
    );
    expect(browse).toContain("verifiedOnly");
    expect(browse).not.toContain("PRODUCT_TYPES");
    expect(browse).toContain("Verified only");
  });

  it("sell page uses verification upload and draft/publish split", () => {
    const sell = readFileSync(
      resolve(__dirname, "../../web/components/marketplace/MarketplaceSellClient.tsx"),
      "utf8"
    );
    expect(sell).toContain("generateVerificationUploadUrl");
    expect(sell).toContain("prepareListingUpload");
    expect(sell).toContain("Save draft");
    expect(sell).not.toContain("CreatorNewsHub");
  });
});
