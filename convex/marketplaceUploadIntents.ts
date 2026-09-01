import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { verificationStatusOf } from "./creatorProfiles";
import { isOfficialMarketplaceListing } from "./marketplaceListingHelpers";

export const MARKETPLACE_PDF_MAX_BYTES = 25 * 1024 * 1024;
export const MARKETPLACE_COVER_MAX_BYTES = 5 * 1024 * 1024;
const INTENT_TTL_MS = 15 * 60 * 1000;

function normalizePdfContentType(contentType: string): string {
  return contentType.split(";")[0]?.trim().toLowerCase() ?? "";
}

function assertPdfUpload(contentType: string, fileName: string, fileSizeBytes: number): void {
  const type = normalizePdfContentType(contentType);
  if (type !== "application/pdf") {
    throw new Error("Product uploads must be PDF files only.");
  }
  if (!fileName.toLowerCase().endsWith(".pdf")) {
    throw new Error("Product file name must end with .pdf");
  }
  if (fileSizeBytes < 1 || fileSizeBytes > MARKETPLACE_PDF_MAX_BYTES) {
    throw new Error("PDF must be between 1 byte and 25 MB.");
  }
}

function assertCoverUpload(contentType: string, fileSizeBytes: number): void {
  const type = normalizePdfContentType(contentType);
  if (!type.startsWith("image/")) {
    throw new Error("Cover uploads must be an image file.");
  }
  if (fileSizeBytes < 1 || fileSizeBytes > MARKETPLACE_COVER_MAX_BYTES) {
    throw new Error("Cover image must be 5 MB or smaller.");
  }
}

/** Server-owned upload intent — returns a one-time Convex storage URL. */
export const prepareListingUpload = mutation({
  args: {
    sessionToken: v.string(),
    listingId: v.id("marketplaceListings"),
    purpose: v.union(v.literal("product_file"), v.literal("cover_image")),
    fileName: v.string(),
    contentType: v.string(),
    fileSizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.creatorId !== email) {
      throw new Error("Listing not found");
    }
    if (isOfficialMarketplaceListing(listing)) {
      throw new Error("Official catalog listings cannot be edited by sellers.");
    }

    const profile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .first();
    if (!profile || verificationStatusOf(profile) !== "approved") {
      throw new Error("Approved creator verification is required before uploading files.");
    }

    const fileName = args.fileName.trim().slice(0, 200);
    if (!fileName) throw new Error("File name is required.");

    if (args.purpose === "product_file") {
      assertPdfUpload(args.contentType, fileName, args.fileSizeBytes);
    } else {
      assertCoverUpload(args.contentType, args.fileSizeBytes);
    }

    const now = Date.now();
    const intentId = await ctx.db.insert("marketplaceUploadIntents", {
      ownerId: email,
      listingId: args.listingId,
      purpose: args.purpose,
      fileName,
      contentType: normalizePdfContentType(args.contentType) || args.contentType.slice(0, 120),
      maxBytes:
        args.purpose === "product_file" ? MARKETPLACE_PDF_MAX_BYTES : MARKETPLACE_COVER_MAX_BYTES,
      expiresAt: now + INTENT_TTL_MS,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    const uploadUrl = await ctx.storage.generateUploadUrl();
    return { intentId, uploadUrl, expiresAt: now + INTENT_TTL_MS };
  },
});

/** Finalize an intent after the client POSTs the bytes to Convex storage. */
export const completeListingUpload = mutation({
  args: {
    sessionToken: v.string(),
    intentId: v.id("marketplaceUploadIntents"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const intent = await ctx.db.get(args.intentId);
    if (!intent || intent.ownerId !== email) {
      throw new Error("Upload intent not found");
    }
    if (intent.status !== "pending") {
      throw new Error("This upload intent is no longer active.");
    }
    if (Date.now() > intent.expiresAt) {
      await ctx.db.patch(args.intentId, { status: "expired", updatedAt: Date.now() });
      throw new Error("Upload intent expired. Start again.");
    }

    const listing = await ctx.db.get(intent.listingId);
    if (!listing || listing.creatorId !== email) {
      throw new Error("Listing not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.intentId, {
      status: "uploaded",
      storageId: args.storageId,
      updatedAt: now,
    });

    if (intent.purpose === "product_file") {
      const patch: Record<string, unknown> = {
        fileStorageId: args.storageId,
        fileName: intent.fileName,
        fileReviewStatus: "pending",
        updatedAt: now,
      };
      if (listing.status === "published") {
        patch.status = "draft";
      }
      await ctx.db.patch(intent.listingId, patch);
      return {
        ok: true as const,
        requiresAdminReview: true,
        message:
          "PDF uploaded. An admin will review it before the product can be published or purchased.",
      };
    }

    const coverUrl = await ctx.storage.getUrl(args.storageId);
    await ctx.db.patch(intent.listingId, {
      coverImageUrl: coverUrl ?? listing.coverImageUrl,
      updatedAt: now,
    });
    await ctx.db.patch(args.intentId, { status: "approved", updatedAt: now });
    return {
      ok: true as const,
      requiresAdminReview: false,
      message: "Cover image updated.",
    };
  },
});
