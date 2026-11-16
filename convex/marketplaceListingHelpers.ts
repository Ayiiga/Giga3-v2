import type { Doc } from "./_generated/dataModel";

export const OFFICIAL_MARKETPLACE_TAG = "giga3-official-series";

export type MarketplaceFileReviewStatus = "pending" | "approved" | "rejected";

type ListingLike = Pick<Doc<"marketplaceListings">, "tags" | "fileStorageId" | "fileReviewStatus"> & {
  productType?: string;
};

export function isPhysicalMarketplaceListing(listing: { productType?: string }): boolean {
  return listing.productType === "physical_item";
}

/** Public visibility for physical listings is independent of PDF download approval. */
export function isMarketplaceListingVisible(listing: ListingLike & {
  status: string;
  coverImageUrl?: string;
  coverStorageId?: unknown;
  stockQuantity?: number;
}): boolean {
  if (listing.status !== "published") return false;
  if (isPhysicalMarketplaceListing(listing)) {
    return Boolean(listing.coverStorageId || listing.coverImageUrl) &&
      Number.isInteger(listing.stockQuantity) && (listing.stockQuantity ?? 0) > 0;
  }
  return isListingFileApproved(listing);
}

export function isOfficialMarketplaceListing(listing: Pick<ListingLike, "tags">): boolean {
  return listing.tags.includes(OFFICIAL_MARKETPLACE_TAG);
}

/** Whether a stored file may be sold or downloaded by buyers. */
export function isListingFileApproved(listing: ListingLike): boolean {
  // Absolute separation: a physical listing must never unlock digital checkout.
  if (isPhysicalMarketplaceListing(listing)) return false;
  if (!listing.fileStorageId) return false;
  if (isOfficialMarketplaceListing(listing)) return true;
  const status = listing.fileReviewStatus ?? "approved";
  return status === "approved";
}

export function listingFileReviewLabel(
  listing: Pick<ListingLike, "fileStorageId" | "fileReviewStatus" | "tags">
): "none" | "pending" | "approved" | "rejected" {
  if (!listing.fileStorageId) return "none";
  if (isOfficialMarketplaceListing(listing)) return "approved";
  return listing.fileReviewStatus ?? "approved";
}

/**
 * Public preview/cover URLs must be http(s) only — reject javascript:/data: etc.
 * Empty input clears the field (returns undefined).
 */
export function sanitizePublicHttpUrl(
  raw: string | undefined,
  fieldLabel: string,
  maxLen = 500
): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`${fieldLabel} must be a valid http(s) URL.`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`${fieldLabel} must use http or https.`);
  }
  return trimmed.slice(0, maxLen);
}
