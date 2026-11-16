import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { adminCredentialArgs, ensureAdminAccess } from "./adminAccess";

const refundReason = v.union(
  v.literal("duplicate_charge"), v.literal("file_unavailable"),
  v.literal("not_as_described"), v.literal("other")
);

/**
 * Request a review of a real paid digital Marketplace order. This creates no
 * Paystack refund, credit, wallet adjustment or seller payout.
 */
export const requestRefund = mutation({
  args: {
    sessionToken: v.string(),
    purchaseId: v.id("marketplacePurchases"),
    reason: refundReason,
    details: v.string(),
  },
  handler: async (ctx, args) => {
    const buyerId = await requireSession(args.sessionToken, ctx);
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase || purchase.buyerId !== buyerId) throw new Error("Purchase not found.");
    const listing = await ctx.db.get(purchase.listingId);
    if (!listing || listing.productType === "physical_item") {
      throw new Error("Refund requests require a paid digital purchase.");
    }
    const payment = await ctx.db.query("payments")
      .withIndex("by_reference", q => q.eq("reference", purchase.paymentReference)).first();
    if (!payment || payment.status !== "success" ||
        payment.type !== "marketplace" || payment.userId !== buyerId) {
      throw new Error("A verified successful Paystack payment is required.");
    }
    const details = args.details.trim().slice(0, 1000);
    if (details.length < 10) throw new Error("Please describe the issue in at least 10 characters.");
    const existing = await ctx.db.query("marketplaceRefundRequests")
      .withIndex("by_purchase", q => q.eq("purchaseId", purchase._id)).first();
    if (existing) throw new Error("A refund request for this purchase already exists.");
    const now = Date.now();
    const id = await ctx.db.insert("marketplaceRefundRequests", {
      purchaseId: purchase._id, buyerId, sellerId: purchase.creatorId,
      paymentReference: purchase.paymentReference,
      reason: args.reason, details, status: "requested",
      createdAt: now, updatedAt: now,
    });
    return { id, message: "Refund review requested. No refund has been issued yet." };
  },
});

export const myRefundRequests = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const buyerId = await requireSession(args.sessionToken, ctx);
    return ctx.db.query("marketplaceRefundRequests")
      .withIndex("by_buyer", q => q.eq("buyerId", buyerId)).order("desc").take(100);
  },
});

export const adminListRefundRequests = query({
  args: adminCredentialArgs,
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    return ctx.db.query("marketplaceRefundRequests")
      .withIndex("by_status", q => q.eq("status", "requested")).order("desc").take(100);
  },
});

/**
 * Admin case-management only. Referred-to-Paystack means an admin took the case
 * to the provider; it does NOT mean pending, processed or completed by Paystack.
 */
export const adminReviewRefundRequest = mutation({
  args: {
    ...adminCredentialArgs,
    requestId: v.id("marketplaceRefundRequests"),
    status: v.union(v.literal("in_review"), v.literal("declined"), v.literal("referred_to_paystack")),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const item = await ctx.db.get(args.requestId);
    if (!item) throw new Error("Refund request not found.");
    if (item.status === "declined" || item.status === "referred_to_paystack") {
      throw new Error("Finalized review cannot be overwritten; verify with Paystack support.");
    }
    const note = args.note.trim().slice(0, 800);
    if (note.length < 8) throw new Error("Enter a review note of at least 8 characters.");
    await ctx.db.patch(args.requestId, {
      status: args.status, adminNote: note, updatedAt: Date.now(),
    });
    return { ok: true as const, message: "Case status recorded; Paystack refund is not automatically issued." };
  },
});
