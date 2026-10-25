import type { Doc, Id } from "./_generated/dataModel";
import { resolveListingCoverUrl } from "./marketplaceCover";
import {
  isListingFileApproved,
  listingFileReviewLabel,
} from "./marketplaceListingHelpers";

type ListingDoc = Doc<"marketplaceListings">;
type ReviewDoc = Doc<"marketplaceReviews">;
type CreatorDoc = Doc<"creatorProfiles">;

type StorageReader = {
  getUrl: (storageId: Id<"_storage">) => Promise<string | null>;
};

/** Public marketplace listing — omits internal storage IDs and creator email. */
export type PublicMarketplaceListing = Omit<
  ListingDoc,
  "fileStorageId" | "creatorId" | "coverStorageId"
> & {
  coverImageUrl?: string;
  hasFile: boolean;
  purchaseReady: boolean;
  fileReviewLabel: ReturnType<typeof listingFileReviewLabel>;
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

/**
 * Sync public projection — does not refresh Convex storage URLs.
 * Prefer `toPublicListingResolved` in Convex query handlers.
 */
export function toPublicListing(listing: ListingDoc): PublicMarketplaceListing {
  const {
    fileStorageId,
    creatorId: _creatorId,
    coverStorageId: _coverStorageId,
    ...rest
  } = listing;
  return {
    ...rest,
    hasFile: Boolean(fileStorageId),
    purchaseReady: listing.status === "published" && isListingFileApproved(listing),
    fileReviewLabel: listingFileReviewLabel(listing),
  };
}

/**
 * Public listing with a fresh cover URL (or stable CDN fallback).
 * Optional `coverIntentStorageId` recovers covers from approved upload intents when
 * the listing row never received coverStorageId (pre-durable-cover uploads).
 */
export async function toPublicListingResolved(
  storage: StorageReader,
  listing: ListingDoc,
  opts?: { coverIntentStorageId?: Id<"_storage"> }
): Promise<PublicMarketplaceListing> {
  const base = toPublicListing(listing);
  let coverImageUrl = await resolveListingCoverUrl(storage, listing);
  if (!coverImageUrl && opts?.coverIntentStorageId) {
    const fromIntent = await storage.getUrl(opts.coverIntentStorageId);
    if (fromIntent) coverImageUrl = fromIntent;
  }
  return { ...base, coverImageUrl };
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

/** Creator-owned listing view — keeps fileStorageId for seller tools; refreshes cover. */
export async function toCreatorListingResolved(
  storage: StorageReader,
  listing: ListingDoc,
  opts?: { coverIntentStorageId?: Id<"_storage"> }
) {
  let coverImageUrl = await resolveListingCoverUrl(storage, listing);
  if (!coverImageUrl && opts?.coverIntentStorageId) {
    const fromIntent = await storage.getUrl(opts.coverIntentStorageId);
    if (fromIntent) coverImageUrl = fromIntent;
  }
  return {
    ...listing,
    coverImageUrl,
    hasFile: Boolean(listing.fileStorageId),
    purchaseReady: listing.status === "published" && isListingFileApproved(listing),
    fileReviewLabel: listingFileReviewLabel(listing),
  };
}

/** Sync creator listing (tests / callers that do not need fresh covers). */
export function toCreatorListing(listing: ListingDoc) {
  return {
    ...listing,
    hasFile: Boolean(listing.fileStorageId),
    purchaseReady: listing.status === "published" && isListingFileApproved(listing),
    fileReviewLabel: listingFileReviewLabel(listing),
  };
}
