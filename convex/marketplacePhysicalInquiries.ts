import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { isMarketplaceListingVisible, isPhysicalMarketplaceListing } from "./marketplaceListingHelpers";

/**
 * In-app interest requests, NOT sales or orders. Buyers must not be charged,
 * digital entitlements are never issued, and addresses remain private.
 */
export const requestItem = mutation({
  args: {
    sessionToken: v.string(),
    listingId: v.id("marketplaceListings"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const buyerId = await requireSession(args.sessionToken, ctx);
    const listing = await ctx.db.get(args.listingId);
    if (!listing || !isPhysicalMarketplaceListing(listing) || !isMarketplaceListingVisible(listing)) {
      throw new Error("This item is not currently available for enquiries.");
    }
    if (listing.creatorId === buyerId) throw new Error("You cannot enquire about your own listing.");
    const message = args.message.trim().slice(0, 500);
    if (message.length < 5) throw new Error("Write at least five characters about the item you want.");

    const existing = await ctx.db.query("marketplacePhysicalInquiries")
      .withIndex("by_buyer_listing", q => q.eq("buyerId", buyerId).eq("listingId", args.listingId))
      .first();
    if (existing) {
      throw new Error("You have already enquired about this item. Check the seller reply below.");
    }

    const now = Date.now();
    await ctx.db.insert("marketplacePhysicalInquiries", {
      listingId: args.listingId,
      buyerId,
      sellerId: listing.creatorId,
      message,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true as const, message: "Enquiry sent. You have not been charged." };
  }
});

export const getMyInquiryForListing = query({
  args: { sessionToken: v.string(), listingId: v.id("marketplaceListings") },
  handler: async (ctx, args) => {
    const buyerId = await requireSession(args.sessionToken, ctx);
    const inquiry = await ctx.db.query("marketplacePhysicalInquiries")
      .withIndex("by_buyer_listing", q => q.eq("buyerId", buyerId).eq("listingId", args.listingId))
      .first();
    if (!inquiry) return null;
    return { _id: inquiry._id, message: inquiry.message, response: inquiry.response ?? null, status: inquiry.status, updatedAt: inquiry.updatedAt };
  }
});

export const getSellerInquiries = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const sellerId = await requireSession(args.sessionToken, ctx);
    const rows = await ctx.db.query("marketplacePhysicalInquiries")
      .withIndex("by_seller", q => q.eq("sellerId", sellerId))
      .order("desc").take(100);
    return await Promise.all(rows.map(async row => {
      const listing = await ctx.db.get(row.listingId);
      return {
        _id: row._id,
        listingId: row.listingId,
        listingTitle: listing?.title ?? "Archived listing",
        message: row.message,
        response: row.response ?? null,
        status: row.status,
        createdAt: row.createdAt,
      };
    }));
  }
});

export const replyToInquiry = mutation({
  args: { sessionToken: v.string(), inquiryId: v.id("marketplacePhysicalInquiries"), response: v.string() },
  handler: async (ctx, args) => {
    const sellerId = await requireSession(args.sessionToken, ctx);
    const inquiry = await ctx.db.get(args.inquiryId);
    if (!inquiry || inquiry.sellerId !== sellerId) throw new Error("Enquiry not found.");
    const response = args.response.trim().slice(0, 800);
    if (response.length < 5) throw new Error("A helpful reply should be at least five characters.");
    await ctx.db.patch(args.inquiryId, { response, status: "replied", updatedAt: Date.now() });
    return { ok: true as const };
  }
});
