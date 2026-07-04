import { describe, expect, it } from "vitest";
import {
  toPublicCreatorProfile,
  toPublicListing,
  toPublicReview,
} from "../../convex/marketplaceViews";

describe("marketplaceViews", () => {
  const listing = {
    _id: "marketplaceListings:1" as any,
    _creationTime: 0,
    creatorId: "creator@example.com",
    title: "Test ebook",
    description: "Desc",
    category: "Education",
    productType: "ebook" as const,
    priceGhs: 10,
    license: "personal" as const,
    tags: ["tag"],
    status: "published" as const,
    ratingAvg: 5,
    ratingCount: 1,
    purchaseCount: 0,
    viewCount: 0,
    fileStorageId: "_storage:secret" as any,
    fileName: "book.pdf",
    createdAt: 1,
    updatedAt: 1,
  };

  it("removes fileStorageId and creatorId from public listings", () => {
    const pub = toPublicListing(listing);
    expect(pub.hasFile).toBe(true);
    expect(pub.title).toBe("Test ebook");
    expect(pub).not.toHaveProperty("fileStorageId");
    expect(pub).not.toHaveProperty("creatorId");
  });

  it("removes buyerId from public reviews", () => {
    const pub = toPublicReview({
      _id: "marketplaceReviews:1" as any,
      _creationTime: 0,
      listingId: listing._id,
      buyerId: "buyer@example.com",
      rating: 5,
      comment: "Great",
      createdAt: 1,
    });
    expect(pub.rating).toBe(5);
    expect(pub).not.toHaveProperty("buyerId");
  });

  it("strips PII from public creator profiles", () => {
    const pub = toPublicCreatorProfile({
      _id: "creatorProfiles:1" as any,
      _creationTime: 0,
      userId: "creator@example.com",
      displayName: "Ada",
      handle: "ada",
      bio: "Maker",
      avatarUrl: undefined,
      website: undefined,
      verified: true,
      verificationStatus: "approved",
      nationalIdNumber: "GHA-123456789-0",
      idDocumentStorageId: "_storage:secret" as any,
      idDocumentFileName: "id.jpg",
      latitude: 5.6,
      longitude: -0.18,
      locationCapturedAt: 1,
      locationAccuracyMeters: 12,
      verificationSubmittedAt: 1,
      totalSales: 2,
      totalEarningsGhs: 40,
      payoutBalanceGhs: 10,
      createdAt: 1,
      updatedAt: 1,
    });
    expect(pub.displayName).toBe("Ada");
    expect(pub).not.toHaveProperty("nationalIdNumber");
    expect(pub).not.toHaveProperty("latitude");
    expect(pub).not.toHaveProperty("userId");
  });
});
