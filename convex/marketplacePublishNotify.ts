import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { resolveListingCoverUrl } from "./marketplaceCover";
import { PUBLISH_CONFIRMATION_BODY } from "./marketplacePublishCopy";

function productPath(listingId: string): string {
  return `/marketplace/item/${encodeURIComponent(listingId)}/`;
}

function promotePath(listingId: string): string {
  return `/marketplace/sell/?promote=${encodeURIComponent(listingId)}`;
}

function formatGhs(price: number): string {
  return `GHS ${Math.round(price)}`;
}

/**
 * After DB confirms published status — claim idempotency, create in-app notification,
 * then schedule email. Email failures never roll back publication.
 */
export const notifyListingPublishedInternal = internalMutation({
  args: {
    listingId: v.id("marketplaceListings"),
  },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status !== "published") {
      return { ok: false as const, reason: "not_published" as const };
    }
    if (listing.publishConfirmationAt) {
      return { ok: true as const, skipped: true as const, reason: "already_confirmed" as const };
    }

    const now = Date.now();
    // Claim before side effects so retries are no-ops.
    await ctx.db.patch(args.listingId, { publishConfirmationAt: now, updatedAt: now });

    const coverImageUrl = await resolveListingCoverUrl(ctx.storage, listing);
    const href = productPath(listing._id);
    const secondaryHref = promotePath(listing._id);
    const dedupeKey = `marketplace_publish:${listing._id}`;
    const priceLabel = formatGhs(listing.priceGhs);

    const existing = await ctx.db
      .query("platformNotifications")
      .withIndex("by_dedupe", (q) => q.eq("dedupeKey", dedupeKey))
      .first();

    let notificationCreated = false;
    if (!existing) {
      await ctx.db.insert("platformNotifications", {
        userId: listing.creatorId,
        category: "marketplace",
        title: "Your product is live",
        body: `${PUBLISH_CONFIRMATION_BODY}\n\n${listing.title} · ${priceLabel}`,
        href,
        secondaryHref,
        secondaryLabel: "Promote Product",
        imageUrl: coverImageUrl,
        dedupeKey,
        read: false,
        createdAt: now,
      });
      notificationCreated = true;
    }

    await ctx.scheduler.runAfter(0, internal.marketplacePublishEmail.sendPublishEmailInternal, {
      listingId: args.listingId,
      creatorEmail: listing.creatorId,
      title: listing.title,
      priceGhs: listing.priceGhs,
      coverImageUrl,
      productPath: href,
      promotePath: secondaryHref,
    });

    return {
      ok: true as const,
      skipped: false as const,
      notificationCreated,
    };
  },
});
