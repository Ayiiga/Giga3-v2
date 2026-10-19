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
