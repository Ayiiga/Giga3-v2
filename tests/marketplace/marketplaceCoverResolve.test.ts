import { describe, expect, it } from "vitest";
import {
  isEphemeralConvexStorageUrl,
  pickStableCoverUrl,
} from "../../convex/marketplaceCover";
import { toPublicListing } from "../../convex/marketplaceViews";

describe("marketplace cover URL resolution", () => {
  it("detects ephemeral Convex storage URLs", () => {
    expect(
      isEphemeralConvexStorageUrl(
        "https://perfect-lark-521.convex.cloud/api/storage/abc123?token=xyz"
      )
    ).toBe(true);
    expect(
      isEphemeralConvexStorageUrl("https://www.giga3ai.com/marketplace/covers/book.jpg")
    ).toBe(false);
  });

  it("prefers fresh storage URL and drops stale signed URLs without storage id", () => {
    expect(
      pickStableCoverUrl({
        freshStorageUrl: "https://perfect-lark-521.convex.cloud/api/storage/fresh",
        coverImageUrl: "https://perfect-lark-521.convex.cloud/api/storage/stale",
      })
    ).toContain("/fresh");

    expect(
      pickStableCoverUrl({
        freshStorageUrl: null,
        coverImageUrl: "https://perfect-lark-521.convex.cloud/api/storage/stale?token=1",
      })
    ).toBeUndefined();

    expect(
      pickStableCoverUrl({
        freshStorageUrl: null,
        coverImageUrl: "https://www.giga3ai.com/images/cover.jpg",
      })
    ).toContain("cover.jpg");
  });

  it("strips coverStorageId from public listings", () => {
    const pub = toPublicListing({
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
      coverStorageId: "_storage:cover" as any,
      coverImageUrl: "https://www.giga3ai.com/images/cover.jpg",
      fileStorageId: "_storage:secret" as any,
      fileName: "book.pdf",
      createdAt: 1,
      updatedAt: 1,
    });
    expect(pub).not.toHaveProperty("coverStorageId");
    expect(pub).not.toHaveProperty("fileStorageId");
    expect(JSON.stringify(pub)).not.toContain("_storage:");
  });
});
