/**
 * Official Giga3 Creator Academy — seed four PDF series at GHS 150 each.
 *
 * After Pages deploy hosts the PDFs, run (production):
 *   npx convex run marketplaceSeed:seedGiga3CreatorSeries \
 *     '{"adminKey":"…"}'
 *
 * Optional:
 *   pdfBaseUrl — defaults to FRONTEND_URL / https://www.giga3ai.com
 *   sellerEmail — defaults to MARKETPLACE_OFFICIAL_SELLER_EMAIL or academy@giga3ai.com
 */

import { action, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { adminCredentialArgs, ensureAdminAccess } from "./adminAccess";
import { toPublicListing } from "./marketplaceViews";

export const CREATOR_SERIES_PRICE_GHS = 150;
export const CREATOR_SERIES_OFFICIAL_TAG = "giga3-official-series";

type SeriesDef = {
  listingTag: string;
  title: string;
  description: string;
  previewText: string;
  category: string;
  fileName: string;
  pdfPath: string;
  coverPath: string;
  tags: string[];
};

const OFFICIAL_SERIES: SeriesDef[] = [
  {
    listingTag: "giga3-series-1",
    title: "Giga3 AI PWA — Series 1: Platform Foundations",
    description:
      "The complete starter guide to the Giga3 AI progressive web app: install on phone or desktop, navigate chat and workspaces, choose Fast/Smart/Vision/Creator models, manage credits and themes, and stay productive offline.",
    previewText:
      "Learn how Giga3 runs as a PWA, how chat messaging works across Convex (and optional Supabase history), and how model tiers map to real product modes — so you start creating with confidence.",
    category: "Technology",
    fileName: "Giga3-AI-PWA-Series-1-Platform-Foundations.pdf",
    pdfPath: "/marketplace/series/giga3-series-1-platform-foundations.pdf",
    coverPath: "/marketplace/series/covers/series-1.svg",
    tags: [CREATOR_SERIES_OFFICIAL_TAG, "giga3-series-1", "giga3", "pwa", "ebook", "academy"],
  },
  {
    listingTag: "giga3-series-2",
    title: "Giga3 AI PWA — Series 2: Create & Publish",
    description:
      "A creator production handbook for Media Studio and GigaEdit: generate and edit images/video, use pro camera workflows, apply templates and aspect crops, bake exports, and hand off polished posts to GigaSocial.",
    previewText:
      "From first frame to publish-ready file — cover fal.ai / Replicate / Google AI Studio failover, GigaEdit tabs, teleprompter, voice, and the publish handoff that lands in the GigaSocial composer.",
    category: "Education",
    fileName: "Giga3-AI-PWA-Series-2-Create-and-Publish.pdf",
    pdfPath: "/marketplace/series/giga3-series-2-create-and-publish.pdf",
    coverPath: "/marketplace/series/covers/series-2.svg",
    tags: [CREATOR_SERIES_OFFICIAL_TAG, "giga3-series-2", "giga3", "gigaedit", "ebook", "academy"],
  },
  {
    listingTag: "giga3-series-3",
    title: "Giga3 AI PWA — Series 3: GigaSocial Creator Playbook",
    description:
      "Grow on GigaSocial: craft posts that perform, use multi-account profiles, tip and gift mechanics, locked content unlocks, discovery, and community habits that turn followers into fans.",
    previewText:
      "Practical playbook for the GigaSocial feed — media controls, like/tip on media, creator gifts, unlocks, composer workflows, and growth loops tuned for African creators.",
    category: "Marketing",
    fileName: "Giga3-AI-PWA-Series-3-GigaSocial-Creator-Playbook.pdf",
    pdfPath: "/marketplace/series/giga3-series-3-gigasocial-creator-playbook.pdf",
    coverPath: "/marketplace/series/covers/series-3.svg",
    tags: [CREATOR_SERIES_OFFICIAL_TAG, "giga3-series-3", "giga3", "gigasocial", "ebook", "academy"],
  },
  {
    listingTag: "giga3-series-4",
    title: "Giga3 AI PWA — Series 4: Monetize & Marketplace",
    description:
      "Turn Giga3 into income: subscriptions and credits, marketplace listings at professional standards, identity verification, Paystack checkout in GHS, buyer delivery, reviews, and creator payouts.",
    previewText:
      "Everything sellers need — listing quality, file delivery, GHS 150 Creator Academy pricing model, platform fees, verification (national ID + GPS), and payout requests from the creator dashboard.",
    category: "Business",
    fileName: "Giga3-AI-PWA-Series-4-Monetize-and-Marketplace.pdf",
    pdfPath: "/marketplace/series/giga3-series-4-monetize-and-marketplace.pdf",
    coverPath: "/marketplace/series/covers/series-4.svg",
    tags: [CREATOR_SERIES_OFFICIAL_TAG, "giga3-series-4", "giga3", "marketplace", "ebook", "academy"],
  },
];

function defaultSellerEmail(): string {
  return (
    process.env.MARKETPLACE_OFFICIAL_SELLER_EMAIL?.trim() ||
    "academy@giga3ai.com"
  );
}

function defaultPdfBaseUrl(): string {
  return (
    process.env.FRONTEND_URL?.replace(/\/$/, "") ||
    "https://www.giga3ai.com"
  );
}

/** Public catalog for the marketplace Creator Academy shelf. */
export const listOfficialCreatorSeries = query({
  args: {},
  handler: async (ctx) => {
    const published = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .take(200);

    return OFFICIAL_SERIES.map((series) => {
      const listing = published.find((row) =>
        row.tags.includes(series.listingTag)
      );
      return {
        listingTag: series.listingTag,
        title: series.title,
        description: series.description,
        previewText: series.previewText,
        category: series.category,
        priceGhs: listing?.priceGhs ?? CREATOR_SERIES_PRICE_GHS,
        pdfPath: series.pdfPath,
        coverPath: series.coverPath,
        listing: listing ? toPublicListing(listing) : null,
      };
    });
  },
});

export const ensureOfficialSellerProfile = internalMutation({
  args: { sellerEmail: v.string() },
  handler: async (ctx, args) => {
    const email = args.sellerEmail.trim().toLowerCase();
    const existing = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        displayName: existing.displayName || "Giga3 Creator Academy",
        verified: true,
        verificationStatus: "approved",
        verificationReviewedAt: now,
        updatedAt: now,
      });
      return { creatorId: email, profileId: existing._id };
    }

    const handleBase = "giga3-academy";
    let handle = handleBase;
    let n = 1;
    while (
      await ctx.db
        .query("creatorProfiles")
        .withIndex("by_handle", (q) => q.eq("handle", handle))
        .first()
    ) {
      handle = `${handleBase}-${n++}`;
    }

    const profileId = await ctx.db.insert("creatorProfiles", {
      userId: email,
      displayName: "Giga3 Creator Academy",
      handle,
      bio: "Official Giga3 AI PWA educational series for creators.",
      verified: true,
      verificationStatus: "approved",
      verificationReviewedAt: now,
      totalSales: 0,
      totalEarningsGhs: 0,
      payoutBalanceGhs: 0,
      createdAt: now,
      updatedAt: now,
    });
    return { creatorId: email, profileId };
  },
});

export const upsertOfficialSeriesListing = internalMutation({
  args: {
    creatorId: v.string(),
    listingTag: v.string(),
    title: v.string(),
    description: v.string(),
    previewText: v.string(),
    category: v.string(),
    tags: v.array(v.string()),
    priceGhs: v.number(),
    coverImageUrl: v.optional(v.string()),
    fileStorageId: v.id("_storage"),
    fileName: v.string(),
    previewUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const published = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .take(200);
    const drafts = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_creator", (q) => q.eq("creatorId", args.creatorId))
      .order("desc")
      .take(100);
    const existing =
      published.find((r) => r.tags.includes(args.listingTag)) ??
      drafts.find((r) => r.tags.includes(args.listingTag));

    const now = Date.now();
    const patch = {
      title: args.title.slice(0, 120),
      description: args.description.slice(0, 4000),
      category: args.category,
      productType: "ebook" as const,
      priceGhs: Math.round(args.priceGhs),
      license: "personal" as const,
      copyrightNotice:
        "© Giga3 AI. Personal license — do not redistribute the PDF files.",
      tags: args.tags.map((t) => t.slice(0, 40)).slice(0, 12),
      previewText: args.previewText.slice(0, 2000),
      previewUrl: args.previewUrl,
      coverImageUrl: args.coverImageUrl,
      fileStorageId: args.fileStorageId,
      fileName: args.fileName.slice(0, 200),
      status: "published" as const,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return { listingId: existing._id, created: false };
    }

    const listingId = await ctx.db.insert("marketplaceListings", {
      creatorId: args.creatorId,
      ...patch,
      ratingAvg: 0,
      ratingCount: 0,
      purchaseCount: 0,
      viewCount: 0,
      createdAt: now,
    });
    return { listingId, created: true };
  },
});

async function fetchAsBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url} (${res.status})`);
  }
  const buf = await res.arrayBuffer();
  const type = res.headers.get("content-type") || "application/octet-stream";
  return new Blob([buf], { type });
}

/** Admin action: upload official series PDFs into Convex storage and publish listings. */
export const seedGiga3CreatorSeries = action({
  args: {
    ...adminCredentialArgs,
    pdfBaseUrl: v.optional(v.string()),
    sellerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const base = (args.pdfBaseUrl?.replace(/\/$/, "") || defaultPdfBaseUrl()).replace(
      /\/$/,
      ""
    );
    const sellerEmail = (args.sellerEmail?.trim() || defaultSellerEmail()).toLowerCase();

    const seller = await ctx.runMutation(
      internal.marketplaceSeed.ensureOfficialSellerProfile,
      { sellerEmail }
    );

    const results: Array<{
      listingTag: string;
      listingId: Id<"marketplaceListings">;
      created: boolean;
      fileName: string;
    }> = [];

    for (const series of OFFICIAL_SERIES) {
      const pdfUrl = `${base}${series.pdfPath}`;
      const coverUrl = `${base}${series.coverPath}`;
      const pdfBlob = await fetchAsBlob(pdfUrl);
      const fileStorageId = await ctx.storage.store(pdfBlob);

      let coverImageUrl: string | undefined = coverUrl;
      try {
        const coverBlob = await fetchAsBlob(coverUrl);
        const coverId = await ctx.storage.store(coverBlob);
        coverImageUrl = (await ctx.storage.getUrl(coverId)) ?? coverUrl;
      } catch {
        // Cover is optional — listing still publishes with public cover URL.
      }

      const upserted = await ctx.runMutation(
        internal.marketplaceSeed.upsertOfficialSeriesListing,
        {
          creatorId: seller.creatorId,
          listingTag: series.listingTag,
          title: series.title,
          description: series.description,
          previewText: series.previewText,
          category: series.category,
          tags: series.tags,
          priceGhs: CREATOR_SERIES_PRICE_GHS,
          coverImageUrl,
          fileStorageId,
          fileName: series.fileName,
          // Do not expose the full PDF as a public preview URL.
          previewUrl: undefined,
        }
      );

      results.push({
        listingTag: series.listingTag,
        listingId: upserted.listingId,
        created: upserted.created,
        fileName: series.fileName,
      });
    }

    return {
      ok: true as const,
      sellerEmail: seller.creatorId,
      priceGhs: CREATOR_SERIES_PRICE_GHS,
      pdfBaseUrl: base,
      listings: results,
    };
  },
});
