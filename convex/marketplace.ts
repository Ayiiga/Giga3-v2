import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import {
  marketplaceLicenseValidator,
  marketplaceProductTypeValidator,
} from "./schema";

const MARKETPLACE_CATEGORIES = [
  "Education",
  "Faith & Inspiration",
  "Business",
  "Design Assets",
  "Technology",
  "Research",
  "Marketing",
  "Productivity",
] as const;

export const listCategories = query({
  args: {},
  handler: async () => MARKETPLACE_CATEGORIES,
});

export const searchListings = query({
  args: {
    query: v.optional(v.string()),
    category: v.optional(v.string()),
    productType: v.optional(marketplaceProductTypeValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cap = Math.min(args.limit ?? 40, 80);
    let rows = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .take(200);

    const q = args.query?.trim().toLowerCase();
    if (args.category) {
      rows = rows.filter((r) => r.category === args.category);
    }
    if (args.productType) {
      rows = rows.filter((r) => r.productType === args.productType);
    }
    if (q) {
      rows = rows.filter((r) => {
        const hay = `${r.title} ${r.description} ${r.tags.join(" ")}`.toLowerCase();
        return hay.includes(q);
      });
    }

    const creators = new Map<string, { displayName: string; handle: string; verified: boolean }>();
    for (const row of rows.slice(0, cap)) {
      if (creators.has(row.creatorId)) continue;
      const profile = await ctx.db
        .query("creatorProfiles")
        .withIndex("by_user", (q) => q.eq("userId", row.creatorId))
        .first();
      if (profile) {
        creators.set(row.creatorId, {
          displayName: profile.displayName,
          handle: profile.handle,
          verified: profile.verified,
        });
      }
    }

    return rows.slice(0, cap).map((listing) => ({
      ...listing,
      creator: creators.get(listing.creatorId) ?? null,
    }));
  },
});

export const getListing = query({
  args: { listingId: v.id("marketplaceListings") },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status !== "published") return null;
    const creator = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", listing.creatorId))
      .first();
    const reviews = await ctx.db
      .query("marketplaceReviews")
      .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
      .order("desc")
      .take(20);
    return { listing, creator, reviews };
  },
});

export const getMyListings = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    return await ctx.db
      .query("marketplaceListings")
      .withIndex("by_creator", (q) => q.eq("creatorId", email))
      .order("desc")
      .take(100);
  },
});

export const createListing = mutation({
  args: {
    sessionToken: v.string(),
    title: v.string(),
    description: v.string(),
    category: v.string(),
    productType: marketplaceProductTypeValidator,
    priceGhs: v.number(),
    license: marketplaceLicenseValidator,
    copyrightNotice: v.optional(v.string()),
    tags: v.array(v.string()),
    previewText: v.optional(v.string()),
    previewUrl: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    publish: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const profile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .first();
    if (!profile) throw new Error("Create a creator profile before listing products.");

    const title = args.title.trim().slice(0, 120);
    const description = args.description.trim().slice(0, 4000);
    if (!title || !description) throw new Error("Title and description are required.");
    if (args.priceGhs < 1) throw new Error("Minimum price is GHS 1.");

    const now = Date.now();
    return await ctx.db.insert("marketplaceListings", {
      creatorId: email,
      title,
      description,
      category: args.category,
      productType: args.productType,
      priceGhs: Math.round(args.priceGhs),
      license: args.license,
      copyrightNotice: args.copyrightNotice?.trim().slice(0, 500),
      tags: args.tags.map((t) => t.trim().slice(0, 40)).filter(Boolean).slice(0, 12),
      previewText: args.previewText?.trim().slice(0, 2000),
      previewUrl: args.previewUrl,
      coverImageUrl: args.coverImageUrl,
      status: args.publish ? "published" : "draft",
      ratingAvg: 0,
      ratingCount: 0,
      purchaseCount: 0,
      viewCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateListing = mutation({
  args: {
    sessionToken: v.string(),
    listingId: v.id("marketplaceListings"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priceGhs: v.optional(v.number()),
    status: v.optional(
      v.union(v.literal("draft"), v.literal("published"), v.literal("archived"))
    ),
    previewText: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.creatorId !== email) throw new Error("Listing not found");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) patch.title = args.title.trim().slice(0, 120);
    if (args.description !== undefined) {
      patch.description = args.description.trim().slice(0, 4000);
    }
    if (args.priceGhs !== undefined) patch.priceGhs = Math.round(args.priceGhs);
    if (args.status !== undefined) patch.status = args.status;
    if (args.previewText !== undefined) patch.previewText = args.previewText?.slice(0, 2000);
    if (args.tags !== undefined) {
      patch.tags = args.tags.map((t) => t.trim().slice(0, 40)).filter(Boolean).slice(0, 12);
    }
    await ctx.db.patch(args.listingId, patch);
  },
});

export const attachListingFile = mutation({
  args: {
    sessionToken: v.string(),
    listingId: v.id("marketplaceListings"),
    storageId: v.id("_storage"),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.creatorId !== email) throw new Error("Listing not found");
    await ctx.db.patch(args.listingId, {
      fileStorageId: args.storageId,
      fileName: args.fileName.slice(0, 200),
      updatedAt: Date.now(),
    });
  },
});

export const generateUploadUrl = mutation({
  args: sessionArgs,
  handler: async (ctx, args) => {
    await requireSession(args.sessionToken);
    return await ctx.storage.generateUploadUrl();
  },
});

export const recordView = mutation({
  args: { listingId: v.id("marketplaceListings") },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status !== "published") return;
    await ctx.db.patch(args.listingId, {
      viewCount: listing.viewCount + 1,
      updatedAt: Date.now(),
    });
  },
});

export const addReview = mutation({
  args: {
    sessionToken: v.string(),
    listingId: v.id("marketplaceListings"),
    rating: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const rating = Math.max(1, Math.min(5, Math.round(args.rating)));
    const purchase = await ctx.db
      .query("marketplacePurchases")
      .withIndex("by_buyer", (q) => q.eq("buyerId", email))
      .collect();
    const owns = purchase.some((p) => p.listingId === args.listingId);
    if (!owns) throw new Error("Purchase this product before leaving a review.");

    const existing = await ctx.db
      .query("marketplaceReviews")
      .withIndex("by_buyer_listing", (q) =>
        q.eq("buyerId", email).eq("listingId", args.listingId)
      )
      .first();
    if (existing) throw new Error("You already reviewed this product.");

    await ctx.db.insert("marketplaceReviews", {
      listingId: args.listingId,
      buyerId: email,
      rating,
      comment: args.comment?.trim().slice(0, 1000),
      createdAt: Date.now(),
    });

    const listing = await ctx.db.get(args.listingId);
    if (!listing) return;
    const reviews = await ctx.db
      .query("marketplaceReviews")
      .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
      .collect();
    const ratingCount = reviews.length;
    const ratingAvg =
      reviews.reduce((sum, r) => sum + r.rating, 0) / Math.max(1, ratingCount);
    await ctx.db.patch(args.listingId, {
      ratingAvg,
      ratingCount,
      updatedAt: Date.now(),
    });
  },
});

export const getDownloadAccess = query({
  args: {
    sessionToken: v.string(),
    listingId: v.id("marketplaceListings"),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const listing = await ctx.db.get(args.listingId);
    if (!listing) return { allowed: false as const };

    const isCreator = listing.creatorId === email;
    const purchases = await ctx.db
      .query("marketplacePurchases")
      .withIndex("by_buyer", (q) => q.eq("buyerId", email))
      .collect();
    const purchased = purchases.some((p) => p.listingId === args.listingId);
    if (!isCreator && !purchased) return { allowed: false as const };
    if (!listing.fileStorageId) return { allowed: false as const, reason: "no_file" as const };

    const url = await ctx.storage.getUrl(listing.fileStorageId);
    return {
      allowed: true as const,
      url,
      fileName: listing.fileName ?? "download",
      license: listing.license,
      copyrightNotice: listing.copyrightNotice ?? null,
    };
  },
});

export const getMyPurchases = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const purchases = await ctx.db
      .query("marketplacePurchases")
      .withIndex("by_buyer", (q) => q.eq("buyerId", email))
      .order("desc")
      .take(50);
    const results = [];
    for (const purchase of purchases) {
      const listing = await ctx.db.get(purchase.listingId);
      if (!listing) continue;
      results.push({ purchase, listing });
    }
    return results;
  },
});

export const getCreatorRevenue = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const profile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .first();
    if (!profile) return null;

    const payouts = await ctx.db
      .query("creatorPayouts")
      .withIndex("by_creator", (q) => q.eq("creatorId", email))
      .order("desc")
      .take(20);

    const sales = await ctx.db
      .query("marketplacePurchases")
      .withIndex("by_creator", (q) => q.eq("creatorId", email))
      .order("desc")
      .take(30);

    return { profile, payouts, sales };
  },
});

export const requestPayout = mutation({
  args: {
    sessionToken: v.string(),
    amountGhs: v.number(),
    method: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const profile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .first();
    if (!profile) throw new Error("Creator profile required.");
    const minPayout = Number(process.env.MARKETPLACE_MIN_PAYOUT_GHS) || 50;
    const amount = Math.round(args.amountGhs);
    if (amount < minPayout) {
      throw new Error(`Minimum payout is GHS ${minPayout}.`);
    }
    if (amount > profile.payoutBalanceGhs) {
      throw new Error("Insufficient payout balance.");
    }

    const now = Date.now();
    await ctx.db.patch(profile._id, {
      payoutBalanceGhs: profile.payoutBalanceGhs - amount,
      updatedAt: now,
    });
    return await ctx.db.insert("creatorPayouts", {
      creatorId: email,
      amountGhs: amount,
      status: "pending",
      method: args.method?.slice(0, 80),
      note: args.note?.slice(0, 300),
      createdAt: now,
      updatedAt: now,
    });
  },
});
