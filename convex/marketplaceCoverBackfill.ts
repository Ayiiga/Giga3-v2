import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { extractConvexStorageIdFromUrl } from "./marketplaceCover";

/**
 * Recover coverStorageId for listings that only stored expired signed URLs.
 * Sources (in order):
 * 1. Approved / uploaded cover upload intents
 * 2. Storage id embedded in a stale coverImageUrl path
 *
 * Safe to re-run (skips rows that already have an id).
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
    let fromIntent = 0;
    let fromUrl = 0;

    for (const listing of listings) {
      if (listing.coverStorageId) continue;

      let recovered = undefined as typeof listing.coverStorageId;
      let source: "intent" | "url" | null = null;

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
      if (cover?.storageId) {
        recovered = cover.storageId;
        source = "intent";
      } else {
        const fromEphemeral = listing.coverImageUrl
          ? extractConvexStorageIdFromUrl(listing.coverImageUrl)
          : undefined;
        if (fromEphemeral) {
          // Confirm the blob still exists before writing the id.
          const alive = await ctx.storage.getUrl(fromEphemeral);
          if (alive) {
            recovered = fromEphemeral;
            source = "url";
          }
        }
      }

      if (!recovered) continue;

      await ctx.db.patch(listing._id, {
        coverStorageId: recovered,
        updatedAt: Date.now(),
      });
      patched += 1;
      if (source === "intent") fromIntent += 1;
      else if (source === "url") fromUrl += 1;
    }

    return { scanned: listings.length, patched, fromIntent, fromUrl };
  },
});
