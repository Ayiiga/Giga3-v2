import { internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { verificationStatusOf } from "./creatorProfiles";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import {
  marketplaceLicenseValidator,
  marketplaceProductTypeValidator,
  marketplaceReportReasonValidator,
} from "./schema";
import { marketplaceUploadsEnabled } from "./marketplaceUploadPolicy";
import { isListingFileApproved } from "./marketplaceListingHelpers";
import {
  aggregatePurchaseTotals,
  clampStorefrontLimit,
  pickEligibleStorefrontListings,
  toSellerRevenueProfile,
} from "./marketplaceCompleteness";
import { requireEntitlementForEmail } from "./entitlements";
import {
  toCreatorListingResolved,
  toPublicCreatorProfile,
  toPublicListingResolved,
  toPublicReview,
} from "./marketplaceViews";
import {
  assertWithdrawalEligibility,
  loadEconomySettings,
  validateWithdrawalAmountGhs,
} from "./gigaSocialEconomy";

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
    /** Comma-separated legacy categories for discovery collections. */
    categoriesAny: v.optional(v.array(v.string())),
    productType: v.optional(marketplaceProductTypeValidator),
    /** Match any of these product types (discovery collections). */
    productTypesAny: v.optional(v.array(marketplaceProductTypeValidator)),
    minPriceGhs: v.optional(v.number()),
    maxPriceGhs: v.optional(v.number()),
    verifiedOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    /** Skip first N purchasable rows after filters (simple pagination). */
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cap = Math.min(args.limit ?? 40, 80);
    const offset = Math.max(0, Math.min(args.offset ?? 0, 400));
    let rows = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .take(200);

    const q = args.query?.trim().toLowerCase();
    if (args.category) {
      rows = rows.filter((r) => r.category === args.category);
    }
    // Discovery collections pass both arrays and mean OR (category or product type).
    const catsAny = args.categoriesAny?.filter(Boolean) ?? [];
    const typesAny = args.productTypesAny ?? [];
    if (catsAny.length > 0 && typesAny.length > 0) {
      const catSet = new Set(catsAny);
      const typeSet = new Set(typesAny);
      rows = rows.filter(
        (r) => catSet.has(r.category) || typeSet.has(r.productType)
      );
    } else if (catsAny.length > 0) {
      const set = new Set(catsAny);
      rows = rows.filter((r) => set.has(r.category));
    } else if (typesAny.length > 0) {
      const set = new Set(typesAny);
      rows = rows.filter((r) => set.has(r.productType));
    }
    if (args.productType) {
      rows = rows.filter((r) => r.productType === args.productType);
    }
    if (args.minPriceGhs != null) {
      rows = rows.filter((r) => r.priceGhs >= args.minPriceGhs!);
    }
    if (args.maxPriceGhs != null) {
      rows = rows.filter((r) => r.priceGhs <= args.maxPriceGhs!);
    }
    if (q) {
      rows = rows.filter((r) => {
        const hay = `${r.title} ${r.description} ${r.tags.join(" ")}`.toLowerCase();
        return hay.includes(q);
      });
    }

    const creators = new Map<string, { displayName: string; handle: string; verified: boolean }>();
    // Load creator profiles for every candidate before verified-only filtering.
    for (const row of rows) {
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

    const filtered = args.verifiedOnly
      ? rows.filter((listing) => creators.get(listing.creatorId)?.verified === true)
      : rows;

    const purchasable = filtered.filter(
      (listing) => listing.status === "published" && isListingFileApproved(listing)
    );

    const page = purchasable.slice(offset, offset + cap);

    return await Promise.all(
      page.map(async (listing) => ({
        ...(await toPublicListingResolved(ctx.storage, listing)),
        creator: creators.get(listing.creatorId) ?? null,
      }))
    );
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
    return {
      listing: await toPublicListingResolved(ctx.storage, listing),
      creator: creator ? toPublicCreatorProfile(creator) : null,
      reviews: reviews.map(toPublicReview),
    };
  },
});

export const getMyListings = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const rows = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_creator", (q) => q.eq("creatorId", email))
      .order("desc")
      .take(100);
    return await Promise.all(rows.map((row) => toCreatorListingResolved(ctx.storage, row)));
  },
});

/**
 * Public storefront catalogue for a creator handle.
 * Only published + file-approved listings; never exposes storage IDs or seller email.
 * Uses by_creator_status so drafts/archived cannot crowd out eligible products.
 */
export const listPublishedByHandle = query({
  args: {
    handle: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const handle = args.handle
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32);
    if (!handle) return { profile: null, listings: [] as const };
    const profile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_handle", (q) => q.eq("handle", handle))
      .first();
    if (!profile) return { profile: null, listings: [] as const };

    const cap = clampStorefrontLimit(args.limit);
    // Published-only index stream — drafts/archived never consume the result budget.
    const publishedRows = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_creator_status", (q) =>
        q.eq("creatorId", profile.userId).eq("status", "published")
      )
      .order("desc")
      .collect();

    const listings = await Promise.all(
      pickEligibleStorefrontListings(
        publishedRows,
        cap,
        isListingFileApproved
      ).map((listing) => toPublicListingResolved(ctx.storage, listing))
    );

    return {
      profile: toPublicCreatorProfile(profile),
      listings,
    };
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
    previewToc: v.optional(v.string()),
    previewIntro: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    coverStorageId: v.optional(v.id("_storage")),
    publish: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    await requireEntitlementForEmail(
      ctx,
      email,
      "marketplace_listing",
      "Marketplace listings require an active Pro or Premium subscription."
    );
    const profile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .first();
    if (!profile) throw new Error("Create a creator profile before listing products.");

    const verification = verificationStatusOf(profile);
    if (verification !== "pending" && verification !== "approved") {
      throw new Error(
        "Submit national ID verification and GPS location before creating listings."
      );
    }
    if (args.publish) {
      throw new Error("Save as draft first. Attach a PDF before publishing.");
    }

    const title = args.title.trim().slice(0, 120);
    const description = args.description.trim().slice(0, 4000);
    if (!title || !description) throw new Error("Title and description are required.");
    if (args.priceGhs < 1) throw new Error("Minimum price is GHS 1.");

    let coverImageUrl = args.coverImageUrl?.trim();
    if (args.coverStorageId) {
      throw new Error("Use prepareListingUpload for cover images.");
    }

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
      previewUrl: args.previewUrl?.trim().slice(0, 500) || undefined,
      previewToc: args.previewToc?.trim().slice(0, 4000) || undefined,
      previewIntro: args.previewIntro?.trim().slice(0, 4000) || undefined,
      coverImageUrl,
      status: "draft",
      ratingAvg: 0,
      ratingCount: 0,
      purchaseCount: 0,
      viewCount: 0,
      promoClickCount: 0,
      previewOpenCount: 0,
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
    category: v.optional(v.string()),
    priceGhs: v.optional(v.number()),
    status: v.optional(
      v.union(v.literal("draft"), v.literal("published"), v.literal("archived"))
    ),
    previewText: v.optional(v.string()),
    previewUrl: v.optional(v.string()),
    previewToc: v.optional(v.string()),
    previewIntro: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    coverImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.creatorId !== email) throw new Error("Listing not found");

    if (args.status === "published") {
      await requireEntitlementForEmail(
        ctx,
        email,
        "marketplace_listing",
        "Marketplace listings require an active Pro or Premium subscription."
      );
      const profile = await ctx.db
        .query("creatorProfiles")
        .withIndex("by_user", (q) => q.eq("userId", email))
        .first();
      if (!profile || verificationStatusOf(profile) !== "approved") {
        throw new Error("Approved verification is required before publishing.");
      }
      if (!listing.fileStorageId) {
        throw new Error("Attach a product file before publishing.");
      }
      if (!isListingFileApproved(listing)) {
        throw new Error("Attach and upload your PDF before publishing.");
      }
    }

    const wasPublished = listing.status === "published";
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) patch.title = args.title.trim().slice(0, 120);
    if (args.description !== undefined) {
      patch.description = args.description.trim().slice(0, 4000);
    }
    if (args.category !== undefined) {
      const category = args.category.trim();
      if (!(MARKETPLACE_CATEGORIES as readonly string[]).includes(category)) {
        throw new Error("Invalid category.");
      }
      patch.category = category;
    }
    if (args.priceGhs !== undefined) {
      const price = Math.round(args.priceGhs);
      if (price < 1 || price > 100_000) throw new Error("Price must be between GHS 1 and GHS 100,000.");
      patch.priceGhs = price;
    }
    if (args.status !== undefined) patch.status = args.status;
    if (args.previewText !== undefined) patch.previewText = args.previewText?.slice(0, 2000);
    if (args.previewUrl !== undefined) {
      patch.previewUrl = args.previewUrl.trim().slice(0, 500) || undefined;
    }
    if (args.previewToc !== undefined) {
      patch.previewToc = args.previewToc.trim().slice(0, 4000) || undefined;
    }
    if (args.previewIntro !== undefined) {
      patch.previewIntro = args.previewIntro.trim().slice(0, 4000) || undefined;
    }
    if (args.coverImageUrl !== undefined) {
      // External / CDN covers only — seller file covers must use prepareListingUpload.
      const url = args.coverImageUrl.trim().slice(0, 500);
      patch.coverImageUrl = url || undefined;
    }
    if (args.tags !== undefined) {
      patch.tags = args.tags.map((t) => t.trim().slice(0, 40)).filter(Boolean).slice(0, 12);
    }
    // Confirm publication in the DB before any success notification.
    await ctx.db.patch(args.listingId, patch);

    if (args.status === "published" && !wasPublished) {
      try {
        await ctx.scheduler.runAfter(
          0,
          internal.marketplacePublishNotify.notifyListingPublishedInternal,
          { listingId: args.listingId }
        );
      } catch {
        // Publication already succeeded — notify retries must never fail the mutation.
      }
    }
  },
});

export const attachListingFile = mutation({
  args: {
    sessionToken: v.string(),
    listingId: v.id("marketplaceListings"),
    storageId: v.id("_storage"),
    fileName: v.string(),
  },
  handler: async () => {
    throw new Error("Use prepareListingUpload and completeListingUpload for PDF attachments.");
  },
});

export const generateUploadUrl = mutation({
  args: sessionArgs,
  handler: async () => {
    throw new Error("Use prepareListingUpload for seller file uploads.");
  },
});

/** Public upload capabilities — PDF intents are always available for verified sellers. */
export const getUploadStatus = query({
  args: {},
  handler: async () => ({
    enabled: true,
    pdfOnly: true,
    requiresAdminReview: false,
    maxMegabytes: 25,
    legacyEnvFlag: marketplaceUploadsEnabled(),
  }),
});

const AUTO_ARCHIVE_REPORT_THRESHOLD = 3;

export const reportListing = mutation({
  args: {
    sessionToken: v.string(),
    listingId: v.id("marketplaceListings"),
    reason: marketplaceReportReasonValidator,
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status !== "published") {
      throw new Error("Listing not found");
    }
    if (listing.creatorId === email) {
      throw new Error("You cannot report your own listing.");
    }

    const existing = await ctx.db
      .query("marketplaceListingReports")
      .withIndex("by_reporter_listing", (q) =>
        q.eq("reporterId", email).eq("listingId", args.listingId)
      )
      .first();
    if (existing) throw new Error("You already reported this listing.");

    const now = Date.now();
    await ctx.db.insert("marketplaceListingReports", {
      listingId: args.listingId,
      reporterId: email,
      reason: args.reason,
      details: args.details?.trim().slice(0, 500),
      status: "open",
      createdAt: now,
    });

    const reports = await ctx.db
      .query("marketplaceListingReports")
      .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
      .collect();
    const openCount = reports.filter((r) => r.status === "open").length;
    if (openCount >= AUTO_ARCHIVE_REPORT_THRESHOLD) {
      await ctx.db.patch(args.listingId, { status: "archived", updatedAt: now });
      return {
        ok: true as const,
        autoArchived: true,
        message: "Report submitted. Listing hidden pending admin review.",
      };
    }

    return {
      ok: true as const,
      autoArchived: false,
      message: "Report submitted. Our team will review it.",
    };
  },
});

export const recordView = mutation({
  args: {
    listingId: v.id("marketplaceListings"),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Signed-in views only — privacy-conscious; anonymous traffic is not counted.
    if (!args.sessionToken) return { ok: false as const, reason: "anonymous" as const };
    await requireSession(args.sessionToken, ctx);
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status !== "published") {
      return { ok: false as const, reason: "not_found" as const };
    }
    await ctx.db.patch(args.listingId, {
      viewCount: listing.viewCount + 1,
      updatedAt: Date.now(),
    });
    return { ok: true as const, kind: "view" as const };
  },
});

/** Promotion-link clicks from the author share panel (privacy-conscious counters). */
export const recordPromoClick = mutation({
  args: {
    listingId: v.id("marketplaceListings"),
    channel: v.optional(
      v.union(
        v.literal("copy"),
        v.literal("whatsapp"),
        v.literal("facebook"),
        v.literal("telegram"),
        v.literal("linkedin"),
        v.literal("other")
      )
    ),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status !== "published") {
      return { ok: false as const };
    }
    // Optional session — promo clicks may come from the author dashboard while signed in.
    if (args.sessionToken) {
      try {
        await requireSession(args.sessionToken, ctx);
      } catch {
        return { ok: false as const };
      }
    }
    await ctx.db.patch(args.listingId, {
      promoClickCount: (listing.promoClickCount ?? 0) + 1,
      updatedAt: Date.now(),
    });
    return { ok: true as const, kind: "promo_click" as const, channel: args.channel ?? "other" };
  },
});

/** Preview engagement (TOC / intro / sample) — not a purchase signal. */
export const recordPreviewOpen = mutation({
  args: {
    listingId: v.id("marketplaceListings"),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status !== "published") {
      return { ok: false as const };
    }
    if (args.sessionToken) {
      try {
        await requireSession(args.sessionToken, ctx);
      } catch {
        /* count anonymously when token is stale */
      }
    }
    await ctx.db.patch(args.listingId, {
      previewOpenCount: (listing.previewOpenCount ?? 0) + 1,
      updatedAt: Date.now(),
    });
    return { ok: true as const, kind: "preview_open" as const };
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
    const email = await requireSession(args.sessionToken, ctx);
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
    const email = await requireSession(args.sessionToken, ctx);
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
    if (!isCreator && !isListingFileApproved(listing)) {
      return { allowed: false as const, reason: "file_pending_review" as const };
    }

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

/** Checkout gate: whether a buyer already owns a listing (avoids double purchase). */
export const isListingPurchasedInternal = internalQuery({
  args: { buyerId: v.string(), listingId: v.id("marketplaceListings") },
  handler: async (ctx, args) => {
    const purchases = await ctx.db
      .query("marketplacePurchases")
      .withIndex("by_buyer", (q) => q.eq("buyerId", args.buyerId))
      .collect();
    return purchases.some((p) => p.listingId === args.listingId);
  },
});

/** Checkout-only listing data. Never expose creator identity through public views. */
export const getListingForCheckoutInternal = internalQuery({
  args: { listingId: v.id("marketplaceListings") },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status !== "published") return null;
    return {
      _id: listing._id,
      title: listing.title,
      priceGhs: listing.priceGhs,
      creatorId: listing.creatorId,
      hasFile: Boolean(listing.fileStorageId),
      purchaseReady: isListingFileApproved(listing),
    };
  },
});

export const getMyPurchases = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const purchases = await ctx.db
      .query("marketplacePurchases")
      .withIndex("by_buyer", (q) => q.eq("buyerId", email))
      .order("desc")
      .take(50);
    const results = [];
    for (const purchase of purchases) {
      const listing = await ctx.db.get(purchase.listingId);
      if (!listing) continue;
      let downloadUrl: string | null = null;
      // Match getDownloadAccess: buyers only receive URLs for approved files.
      if (listing.fileStorageId && isListingFileApproved(listing)) {
        downloadUrl = await ctx.storage.getUrl(listing.fileStorageId);
      }
      results.push({
        purchase: {
          _id: purchase._id,
          listingId: purchase.listingId,
          amountGhs: purchase.amountGhs,
          platformFeeGhs: purchase.platformFeeGhs,
          creatorEarningsGhs: purchase.creatorEarningsGhs,
          license: purchase.license,
          createdAt: purchase.createdAt,
          paymentReference: purchase.paymentReference,
        },
        // Never expose private storage IDs or seller email on the buyer library.
        listing: await toPublicListingResolved(ctx.storage, listing),
        /** Expiring Convex storage URL when the buyer owns a file-backed listing. */
        downloadUrl,
        fileName: listing.fileName ?? "download",
        hasDownload: Boolean(downloadUrl),
        downloadPendingReview:
          Boolean(listing.fileStorageId) && !isListingFileApproved(listing),
      });
    }
    return results;
  },
});

export const getCreatorRevenue = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
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

    // Strip buyer emails and sensitive verification/location fields.
    return {
      profile: toSellerRevenueProfile(profile),
      payouts,
      sales: sales.map((sale) => ({
        _id: sale._id,
        listingId: sale.listingId,
        amountGhs: sale.amountGhs,
        platformFeeGhs: sale.platformFeeGhs,
        creatorEarningsGhs: sale.creatorEarningsGhs,
        createdAt: sale.createdAt,
        paymentReference: sale.paymentReference,
        license: sale.license,
      })),
    };
  },
});

/**
 * Seller sales analytics. marketplacePurchases rows are written only after
 * successful Paystack fulfilment (pending/failed charges never appear here).
 * Refunds are not modeled in the current schema — disclosed in the response.
 *
 * Date filtering uses the by_creator(createdAt) index range + collect() so
 * totals are never silently truncated by a pre-filter take(N).
 */
export const getCreatorSalesAnalytics = query({
  args: {
    sessionToken: v.string(),
    fromMs: v.optional(v.number()),
    toMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const profile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .first();
    if (!profile) return null;

    const fromMs = args.fromMs ?? 0;
    const toMs = args.toMs ?? Number.MAX_SAFE_INTEGER;

    // Indexed range on (creatorId, createdAt) — every matching purchase.
    const sales = await ctx.db
      .query("marketplacePurchases")
      .withIndex("by_creator", (q) =>
        q.eq("creatorId", email).gte("createdAt", fromMs).lte("createdAt", toMs)
      )
      .order("desc")
      .collect();

    const totals = aggregatePurchaseTotals(
      sales.map((sale) => ({
        listingId: String(sale.listingId),
        amountGhs: sale.amountGhs,
        platformFeeGhs: sale.platformFeeGhs,
        creatorEarningsGhs: sale.creatorEarningsGhs,
        createdAt: sale.createdAt,
      }))
    );

    const byListing = new Map<
      string,
      { listingId: string; purchaseCount: number; grossGhs: number; earningsGhs: number; feesGhs: number }
    >();

    for (const sale of sales) {
      const key = String(sale.listingId);
      const row = byListing.get(key) ?? {
        listingId: key,
        purchaseCount: 0,
        grossGhs: 0,
        earningsGhs: 0,
        feesGhs: 0,
      };
      row.purchaseCount += 1;
      row.grossGhs += sale.amountGhs;
      row.earningsGhs += sale.creatorEarningsGhs;
      row.feesGhs += sale.platformFeeGhs;
      byListing.set(key, row);
    }

    const productSummaries = [];
    for (const row of byListing.values()) {
      const listing = await ctx.db.get(row.listingId as any);
      productSummaries.push({
        listingId: row.listingId,
        title: listing?.title ?? "Deleted listing",
        status: listing?.status ?? "archived",
        purchaseCount: row.purchaseCount,
        grossGhs: row.grossGhs,
        feesGhs: row.feesGhs,
        earningsGhs: row.earningsGhs,
        // Engagement counters (distinct from confirmed Paystack purchases).
        viewCount: listing?.viewCount ?? 0,
        promoClickCount: listing?.promoClickCount ?? 0,
        previewOpenCount: listing?.previewOpenCount ?? 0,
      });
    }
    productSummaries.sort((a, b) => b.grossGhs - a.grossGhs);

    const payouts = await ctx.db
      .query("creatorPayouts")
      .withIndex("by_creator", (q) => q.eq("creatorId", email))
      .order("desc")
      .take(30);

    const recentSales = [];
    for (const sale of sales.slice(0, 20)) {
      const listing = await ctx.db.get(sale.listingId);
      recentSales.push({
        _id: sale._id,
        listingId: sale.listingId,
        listingTitle: listing?.title ?? "Listing",
        amountGhs: sale.amountGhs,
        platformFeeGhs: sale.platformFeeGhs,
        creatorEarningsGhs: sale.creatorEarningsGhs,
        createdAt: sale.createdAt,
      });
    }

    return {
      summary: {
        grossSalesGhs: totals.grossSalesGhs,
        purchaseCount: totals.purchaseCount,
        platformFeesGhs: totals.platformFeesGhs,
        creatorEarningsGhs: totals.creatorEarningsGhs,
        payoutBalanceGhs: profile.payoutBalanceGhs,
        lifetimeSales: profile.totalSales,
        lifetimeEarningsGhs: profile.totalEarningsGhs,
      },
      productSummaries,
      recentSales,
      payouts: payouts.map((p) => ({
        _id: p._id,
        amountGhs: p.amountGhs,
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        method: p.method ?? null,
      })),
      limitations: {
        refundsSupported: false,
        automatedPayouts: false,
        source: "marketplacePurchases rows are created only after successful Paystack fulfilment",
      },
    };
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
    const email = await requireSession(args.sessionToken, ctx);
    const profile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .first();
    if (!profile) throw new Error("Creator profile required.");
    if (profile.userId !== email) {
      throw new Error("Payout profile ownership mismatch.");
    }

    // When the seller also has a GigaSocial profile, enforce 50-fan + acceptance rules.
    const socialProfile = await ctx.db
      .query("socialProfiles")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .first();
    let minPayout = Number(process.env.MARKETPLACE_MIN_PAYOUT_GHS) || 50;
    if (socialProfile) {
      if (socialProfile.userId !== email) {
        throw new Error("Profile ownership mismatch.");
      }
      const { settings } = await assertWithdrawalEligibility(ctx, socialProfile);
      minPayout = Math.max(minPayout, settings.minWithdrawalGhs);
    } else {
      const settings = await loadEconomySettings(ctx);
      minPayout = Math.max(minPayout, settings.minWithdrawalGhs);
    }

    const validated = validateWithdrawalAmountGhs({
      rawAmount: args.amountGhs,
      availableBalanceGhs: profile.payoutBalanceGhs,
      minWithdrawalGhs: minPayout,
    });
    if (!validated.ok) {
      throw new Error(validated.error);
    }
    const amount = validated.amountGhs;

    const now = Date.now();
    const recent = await ctx.db
      .query("creatorPayouts")
      .withIndex("by_creator", (q) => q.eq("creatorId", email))
      .order("desc")
      .take(10);
    const inFlight = recent.find(
      (p) => p.status === "pending" || p.status === "processing"
    );
    if (inFlight) {
      throw new Error("A withdrawal is already in progress.");
    }

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
