import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

function platformFeePercent(): number {
  return Number(process.env.MARKETPLACE_PLATFORM_FEE_PERCENT) || 15;
}

export const fulfillMarketplacePurchaseInternal = internalMutation({
  args: {
    reference: v.string(),
    buyerId: v.string(),
    listingId: v.id("marketplaceListings"),
    amountGhs: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("marketplacePurchases")
      .withIndex("by_reference", (q) => q.eq("paymentReference", args.reference))
      .first();
    if (existing) return { alreadyFulfilled: true as const };

    // Guard against double-counting a listing the buyer already owns (e.g. a
    // second payment slipped past the checkout ownership check). Access is
    // already granted by the first purchase, so just no-op here.
    const buyerPurchases = await ctx.db
      .query("marketplacePurchases")
      .withIndex("by_buyer", (q) => q.eq("buyerId", args.buyerId))
      .collect();
    if (buyerPurchases.some((p) => p.listingId === args.listingId)) {
      return { alreadyFulfilled: true as const };
    }

    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status !== "published") {
      throw new Error("Listing unavailable");
    }
    if (listing.creatorId === args.buyerId) {
      throw new Error("Cannot purchase your own listing");
    }

    const feePct = platformFeePercent();
    const platformFeeGhs = Math.round((args.amountGhs * feePct) / 100);
    const creatorEarningsGhs = args.amountGhs - platformFeeGhs;

    await ctx.db.insert("marketplacePurchases", {
      buyerId: args.buyerId,
      listingId: args.listingId,
      creatorId: listing.creatorId,
      amountGhs: args.amountGhs,
      platformFeeGhs,
      creatorEarningsGhs,
      paymentReference: args.reference,
      license: listing.license,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.listingId, {
      purchaseCount: listing.purchaseCount + 1,
      updatedAt: Date.now(),
    });

    const creator = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", listing.creatorId))
      .first();
    if (creator) {
      await ctx.db.patch(creator._id, {
        totalSales: creator.totalSales + 1,
        totalEarningsGhs: creator.totalEarningsGhs + creatorEarningsGhs,
        payoutBalanceGhs: creator.payoutBalanceGhs + creatorEarningsGhs,
        updatedAt: Date.now(),
      });
    }

    return { alreadyFulfilled: false as const, creatorEarningsGhs };
  },
});
