import type { Doc } from "./_generated/dataModel";

export const OFFICIAL_MARKETPLACE_TAG = "giga3-official-series";

export type MarketplaceFileReviewStatus = "pending" | "approved" | "rejected";

type ListingLike = Pick<Doc<"marketplaceListings">, "tags" | "fileStorageId" | "fileReviewStatus">;

export function isOfficialMarketplaceListing(listing: Pick<ListingLike, "tags">): boolean {
  return listing.tags.includes(OFFICIAL_MARKETPLACE_TAG);
}

/** Whether a stored file may be sold or downloaded by buyers. */
export function isListingFileApproved(listing: ListingLike): boolean {
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
