import type { Doc } from "./_generated/dataModel";

type ListingDoc = Doc<"marketplaceListings">;
type ReviewDoc = Doc<"marketplaceReviews">;
type CreatorDoc = Doc<"creatorProfiles">;

/** Public marketplace listing — omits internal storage IDs and creator email. */
export type PublicMarketplaceListing = Omit<
  ListingDoc,
  "fileStorageId" | "creatorId"
> & {
  hasFile: boolean;
};

export type PublicMarketplaceReview = Omit<ReviewDoc, "buyerId">;

export type PublicCreatorProfile = Pick<
  CreatorDoc,
  | "displayName"
  | "handle"
  | "bio"
  | "avatarUrl"
  | "website"
  | "verified"
  | "totalSales"
  | "createdAt"
>;

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

/** Public creator card — strips PII (national ID, GPS, documents). */
export function toPublicCreatorProfile(
  profile: CreatorDoc
): PublicCreatorProfile {
  return {
    displayName: profile.displayName,
    handle: profile.handle,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    website: profile.website,
    verified: profile.verified,
    totalSales: profile.totalSales,
    createdAt: profile.createdAt,
  };
}

/** Creator-owned listing view — keeps fileStorageId for seller tools. */
export function toCreatorListing(listing: ListingDoc) {
  return {
    ...listing,
    hasFile: Boolean(listing.fileStorageId),
  };
}
