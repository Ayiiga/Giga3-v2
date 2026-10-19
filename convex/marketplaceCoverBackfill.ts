import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Recover coverStorageId from approved cover upload intents for listings that
 * only stored expired signed URLs. Safe to re-run (skips rows that already have an id).
 */
export const backfillCoverStorageIds = internalMutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cap = Math.min(args.limit ?? 100, 300);
    const listings = await ctx.db
      .query("marketplaceListings")
      .order("desc")
      .take(cap);

    let patched = 0;
    for (const listing of listings) {
      if (listing.coverStorageId) continue;
      const intents = await ctx.db
        .query("marketplaceUploadIntents")
        .withIndex("by_listing", (q) => q.eq("listingId", listing._id))
        .order("desc")
        .take(30);
      const cover = intents.find(
        (intent) =>
          intent.purpose === "cover_image" &&
          intent.storageId &&
          (intent.status === "approved" || intent.status === "uploaded")
      );
      if (!cover?.storageId) continue;
      await ctx.db.patch(listing._id, {
        coverStorageId: cover.storageId,
        updatedAt: Date.now(),
      });
      patched += 1;
    }
    return { scanned: listings.length, patched };
  },
});
