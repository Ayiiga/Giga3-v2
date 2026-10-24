import { describe, expect, it } from "vitest";
import {
  extractConvexStorageIdFromUrl,
  hasDurableCover,
  isEphemeralConvexStorageUrl,
  pickStableCoverUrl,
  resolveListingCoverUrl,
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

  it("extracts storage ids from signed Convex cover URLs", () => {
    expect(
      extractConvexStorageIdFromUrl(
        "https://perfect-lark-521.convex.cloud/api/storage/kg2coverblob99?token=expired"
      )
    ).toBe("kg2coverblob99");
    expect(
      extractConvexStorageIdFromUrl(
        "https://perfect-lark-521.convex.cloud/api/storage/b028a5a6-f594-4284-bcc4-e44dd06ebcae"
      )
    ).toBe("b028a5a6-f594-4284-bcc4-e44dd06ebcae");
    expect(
      extractConvexStorageIdFromUrl("https://www.giga3ai.com/images/cover.jpg")
    ).toBeUndefined();
  });

  it("prefers fresh storage URL and drops stale signed URLs without recovery", () => {
    expect(
      pickStableCoverUrl({
        freshStorageUrl: "https://perfect-lark-521.convex.cloud/api/storage/fresh",
        coverImageUrl: "https://perfect-lark-521.convex.cloud/api/storage/stale",
      })
    ).toContain("/fresh");

    expect(
      pickStableCoverUrl({
        freshStorageUrl: null,
        recoveredFromEphemeralUrl: "https://perfect-lark-521.convex.cloud/api/storage/recovered",
        coverImageUrl: "https://perfect-lark-521.convex.cloud/api/storage/stale?token=1",
      })
    ).toContain("/recovered");

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

  it("resolves covers via coverStorageId for the matching listing only", async () => {
    const storage = {
      async getUrl(id: string) {
        if (id === "storage-ebook-a") {
          return "https://perfect-lark-521.convex.cloud/api/storage/ebook-a-fresh";
        }
        if (id === "storage-ebook-b") {
          return "https://perfect-lark-521.convex.cloud/api/storage/ebook-b-fresh";
        }
        return null;
      },
    };

    const a = await resolveListingCoverUrl(storage as any, {
      coverStorageId: "storage-ebook-a" as any,
      coverImageUrl: "https://www.giga3ai.com/wrong.jpg",
    });
    const b = await resolveListingCoverUrl(storage as any, {
      coverStorageId: "storage-ebook-b" as any,
    });
    expect(a).toContain("ebook-a-fresh");
    expect(b).toContain("ebook-b-fresh");
    expect(a).not.toEqual(b);
  });

  it("recovers author covers from stale signed URLs when storage blob still exists", async () => {
    const storage = {
      async getUrl(id: string) {
        if (id === "legacyCoverBlob") {
          return "https://perfect-lark-521.convex.cloud/api/storage/legacyCoverBlob?token=fresh";
        }
        return null;
      },
    };
    const url = await resolveListingCoverUrl(storage as any, {
      coverImageUrl:
        "https://perfect-lark-521.convex.cloud/api/storage/legacyCoverBlob?token=expired",
    });
    expect(url).toContain("legacyCoverBlob");
    expect(url).toContain("token=fresh");
  });

  it("returns undefined for missing covers and dead storage blobs", async () => {
    const storage = {
      async getUrl() {
        return null;
      },
    };
    expect(await resolveListingCoverUrl(storage as any, {})).toBeUndefined();
    expect(
      await resolveListingCoverUrl(storage as any, {
        coverStorageId: "missing" as any,
      })
    ).toBeUndefined();
    expect(
      await resolveListingCoverUrl(storage as any, {
        coverImageUrl:
          "https://perfect-lark-521.convex.cloud/api/storage/gone?token=1",
      })
    ).toBeUndefined();
  });

  it("keeps durable CDN covers and rejects ephemeral-only as durable", () => {
    expect(
      hasDurableCover({
        coverImageUrl: "https://cdn.example.com/covers/book.png",
      })
    ).toBe(true);
    expect(
      hasDurableCover({
        coverImageUrl:
          "https://perfect-lark-521.convex.cloud/api/storage/x?token=1",
      })
    ).toBe(false);
    expect(
      hasDurableCover({
        coverStorageId: "storage-1" as any,
        coverImageUrl:
          "https://perfect-lark-521.convex.cloud/api/storage/x?token=1",
      })
    ).toBe(true);
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
