import type { Doc } from "./_generated/dataModel";

type ListingDoc = Doc<"marketplaceListings">;
type ReviewDoc = Doc<"marketplaceReviews">;

/** Public marketplace listing — omits internal storage IDs and creator email. */
export type PublicMarketplaceListing = Omit<
  ListingDoc,
  "fileStorageId" | "creatorId"
> & {
  hasFile: boolean;
};

export type PublicMarketplaceReview = Omit<ReviewDoc, "buyerId">;

export function toPublicListing(listing: ListingDoc): PublicMarketplaceListing {
  const { fileStorageId, creatorId: _creatorId, ...rest } = listing;
  return {
    ...rest,
    hasFile: Boolean(fileStorageId),
  };
}

export function toPublicReview(review: ReviewDoc): PublicMarketplaceReview {
  const { buyerId: _buyerId, ...rest } = review;
  return rest;
}

/** Creator-owned listing view — keeps fileStorageId for seller tools. */
export function toCreatorListing(listing: ListingDoc) {
  return {
    ...listing,
    hasFile: Boolean(listing.fileStorageId),
  };
}
