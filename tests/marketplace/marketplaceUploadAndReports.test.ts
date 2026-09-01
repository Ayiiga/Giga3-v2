import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isListingFileApproved,
  isOfficialMarketplaceListing,
  listingFileReviewLabel,
} from "../../convex/marketplaceListingHelpers";

describe("marketplace listing helpers", () => {
  it("auto-approves official catalog tags", () => {
    const listing = {
      tags: ["giga3-official-series", "giga3-series-1"],
      fileStorageId: "storage123" as any,
      fileReviewStatus: undefined,
    };
    expect(isOfficialMarketplaceListing(listing)).toBe(true);
    expect(isListingFileApproved(listing)).toBe(true);
    expect(listingFileReviewLabel(listing)).toBe("approved");
  });

  it("requires admin approval for seller PDFs", () => {
    const listing = {
      tags: ["ebook"],
      fileStorageId: "storage123" as any,
      fileReviewStatus: "pending" as const,
    };
    expect(isListingFileApproved(listing)).toBe(false);
    expect(listingFileReviewLabel(listing)).toBe("pending");
  });
});

describe("marketplace PDF upload intents", () => {
  it("defines prepare and complete mutations with PDF limits", () => {
    const source = readFileSync(
      resolve(__dirname, "../../convex/marketplaceUploadIntents.ts"),
      "utf8"
    );
    expect(source).toContain("prepareListingUpload");
    expect(source).toContain("completeListingUpload");
    expect(source).toContain("application/pdf");
    expect(source).toContain("fileReviewStatus: \"pending\"");
  });

  it("routes legacy attach/generate through intent-only errors", () => {
    const source = readFileSync(resolve(__dirname, "../../convex/marketplace.ts"), "utf8");
    expect(source).toContain("prepareListingUpload and completeListingUpload");
  });
});

describe("marketplace listing reports", () => {
  it("supports buyer reports with auto-archive threshold", () => {
    const source = readFileSync(resolve(__dirname, "../../convex/marketplace.ts"), "utf8");
    expect(source).toContain("reportListing");
    expect(source).toContain("AUTO_ARCHIVE_REPORT_THRESHOLD = 3");
    expect(source).toContain("marketplaceListingReports");
  });

  it("exposes report UI on item page", () => {
    const source = readFileSync(
      resolve(__dirname, "../../web/components/marketplace/MarketplaceItemClient.tsx"),
      "utf8"
    );
    expect(source).toContain("Report listing");
    expect(source).toContain("reportListing");
  });

  it("shows admin PDF review and report queues", () => {
    const source = readFileSync(
      resolve(__dirname, "../../web/components/admin/AdminDashboardClient.tsx"),
      "utf8"
    );
    expect(source).toContain("PDF review queue");
    expect(source).toContain("Listing reports");
    expect(source).toContain("setListingFileReview");
  });
});
