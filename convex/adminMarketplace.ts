import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { adminCredentialArgs, ensureAdminAccess } from "./adminAccess";

const PAYMENT_SAMPLE = 2000;
const LISTING_SAMPLE = 100;
const PAYOUT_SAMPLE = 200;

/** Revenue, payouts and marketplace moderation snapshot for the admin dashboard. */
export const getAdminOverview = query({
  args: adminCredentialArgs,
  handler: async (ctx, args) => {
    try {
      await ensureAdminAccess(args);
    } catch {
      return null;
    }

    const payments = await ctx.db.query("payments").order("desc").take(PAYMENT_SAMPLE);
    const successful = payments.filter((p) => p.status === "success");
    const byType: Record<string, number> = {};
    let totalRevenueGhs = 0;
    for (const p of successful) {
      byType[p.type] = (byType[p.type] ?? 0) + p.amountGhs;
      totalRevenueGhs += p.amountGhs;
    }

    const payouts = await ctx.db
      .query("creatorPayouts")
      .order("desc")
      .take(PAYOUT_SAMPLE);
    const pendingPayouts = payouts.filter(
      (p) => p.status === "pending" || p.status === "processing"
    );

    const listings = await ctx.db
      .query("marketplaceListings")
      .order("desc")
      .take(LISTING_SAMPLE);

    return {
      revenue: {
        totalRevenueGhs,
        byType,
        successfulCount: successful.length,
        sampleSize: payments.length,
      },
      pendingVerifications: (
        await ctx.db
          .query("creatorProfiles")
          .withIndex("by_verification_status", (q) =>
            q.eq("verificationStatus", "pending")
          )
          .take(50)
      ).map((p) => ({
        _id: p._id,
        displayName: p.displayName,
        handle: p.handle,
        userId: p.userId,
        verificationSubmittedAt: p.verificationSubmittedAt ?? null,
        locationCapturedAt: p.locationCapturedAt ?? null,
        idDocumentFileName: p.idDocumentFileName ?? null,
      })),
      pendingPayouts: pendingPayouts.map((p) => ({
        _id: p._id,
        creatorId: p.creatorId,
        amountGhs: p.amountGhs,
        status: p.status,
        method: p.method ?? null,
        note: p.note ?? null,
        createdAt: p.createdAt,
      })),
      payoutTotals: {
        pendingGhs: pendingPayouts.reduce((s, p) => s + p.amountGhs, 0),
        pendingCount: pendingPayouts.length,
      },
      listings: listings.map((l) => ({
        _id: l._id,
        title: l.title,
        creatorId: l.creatorId,
        status: l.status,
        priceGhs: l.priceGhs,
        purchaseCount: l.purchaseCount,
        hasFile: Boolean(l.fileStorageId),
        createdAt: l.createdAt,
      })),
      listingStats: {
        total: listings.length,
        published: listings.filter((l) => l.status === "published").length,
        draft: listings.filter((l) => l.status === "draft").length,
        archived: listings.filter((l) => l.status === "archived").length,
        publishedWithoutFile: listings.filter(
          (l) => l.status === "published" && !l.fileStorageId
        ).length,
      },
      recentSales: successful
        .filter((p) => p.type === "marketplace")
        .slice(0, 20)
        .map((p) => ({
          _id: p._id,
          amountGhs: p.amountGhs,
          userId: p.userId,
          createdAt: p.createdAt,
        })),
    };
  },
});

/** Advance a creator payout through its lifecycle. Refunds balance if failed. */
export const setPayoutStatus = mutation({
  args: {
    ...adminCredentialArgs,
    payoutId: v.id("creatorPayouts"),
    status: v.union(
      v.literal("processing"),
      v.literal("paid"),
      v.literal("failed")
    ),
    reference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const payout = await ctx.db.get(args.payoutId);
    if (!payout) throw new Error("Payout not found");

    // Returning funds to the creator when a payout fails.
    if (args.status === "failed" && payout.status !== "failed") {
      const profile = await ctx.db
        .query("creatorProfiles")
        .withIndex("by_user", (q) => q.eq("userId", payout.creatorId))
        .first();
      if (profile) {
        await ctx.db.patch(profile._id, {
          payoutBalanceGhs: profile.payoutBalanceGhs + payout.amountGhs,
          updatedAt: Date.now(),
        });
      }
    }

    await ctx.db.patch(args.payoutId, {
      status: args.status,
      reference: args.reference?.trim() || payout.reference,
      updatedAt: Date.now(),
    });
    return { ok: true as const };
  },
});

/** Moderate a listing (publish / archive / draft). */
export const setListingStatus = mutation({
  args: {
    ...adminCredentialArgs,
    listingId: v.id("marketplaceListings"),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived")
    ),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const listing = await ctx.db.get(args.listingId);
    if (!listing) throw new Error("Listing not found");
    await ctx.db.patch(args.listingId, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return { ok: true as const };
  },
});

/** Approve or reject a creator identity verification submission. */
export const setCreatorVerificationStatus = mutation({
  args: {
    ...adminCredentialArgs,
    profileId: v.id("creatorProfiles"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("Creator profile not found");

    const now = Date.now();
    if (args.status === "approved") {
      await ctx.db.patch(args.profileId, {
        verificationStatus: "approved",
        verified: true,
        verificationReviewedAt: now,
        verificationRejectionReason: undefined,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(args.profileId, {
        verificationStatus: "rejected",
        verified: false,
        verificationReviewedAt: now,
        verificationRejectionReason:
          args.rejectionReason?.trim().slice(0, 500) ||
          "Verification could not be confirmed.",
        updatedAt: now,
      });
    }
    return { ok: true as const };
  },
});
