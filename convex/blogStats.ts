import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  applyBlogRatingDelta,
  computeBlogRatingAggregate,
  normalizeBlogClientId,
  normalizeBlogRating,
} from "./blogRatingLogic";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 120;

function normalizeSlug(slug: string): string | null {
  const normalized = slug.trim().toLowerCase();
  if (!normalized || normalized.length > MAX_SLUG_LENGTH) return null;
  if (!SLUG_PATTERN.test(normalized)) return null;
  return normalized;
}

function emptyRating() {
  return computeBlogRatingAggregate(0, 0);
}

function ratingFromRow(row: {
  ratingSum?: number;
  ratingCount?: number;
  ratingAvg?: number;
} | null) {
  if (!row) return emptyRating();
  return computeBlogRatingAggregate(row.ratingSum ?? 0, row.ratingCount ?? 0);
}

export const getStats = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const slug = normalizeSlug(args.slug);
    if (!slug) return { viewCount: 0, ...emptyRating(), viewerRating: null as number | null };

    const row = await ctx.db
      .query("blogPostStats")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    return {
      viewCount: row?.viewCount ?? 0,
      ...ratingFromRow(row),
      viewerRating: null as number | null,
    };
  },
});

/** Live aggregates plus this client's prior rating (when clientId is provided). */
export const getRatingStats = query({
  args: {
    slug: v.string(),
    clientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slug = normalizeSlug(args.slug);
    if (!slug) {
      return { ...emptyRating(), viewerRating: null as number | null };
    }

    const row = await ctx.db
      .query("blogPostStats")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    const clientId = args.clientId ? normalizeBlogClientId(args.clientId) : null;
    let viewerRating: number | null = null;
    if (clientId) {
      const existing = await ctx.db
        .query("blogPostRatings")
        .withIndex("by_slug_client", (q) => q.eq("slug", slug).eq("clientId", clientId))
        .unique();
      viewerRating = existing?.rating ?? null;
    }

    return {
      ...ratingFromRow(row),
      viewerRating,
    };
  },
});

export const getStatsBatch = query({
  args: {
    slugs: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const counts: Record<string, number> = {};
    for (const raw of args.slugs) {
      const slug = normalizeSlug(raw);
      if (!slug) continue;
      const row = await ctx.db
        .query("blogPostStats")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      counts[slug] = row?.viewCount ?? 0;
    }
    return counts;
  },
});

export const recordView = mutation({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const slug = normalizeSlug(args.slug);
    if (!slug) return { ok: false as const };

    const existing = await ctx.db
      .query("blogPostStats")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    const now = Date.now();
    if (existing) {
      const viewCount = existing.viewCount + 1;
      await ctx.db.patch(existing._id, { viewCount, updatedAt: now });
      return { ok: true as const, viewCount };
    }

    await ctx.db.insert("blogPostStats", {
      slug,
      viewCount: 1,
      ratingSum: 0,
      ratingCount: 0,
      ratingAvg: 0,
      updatedAt: now,
    });
    return { ok: true as const, viewCount: 1 };
  },
});

/**
 * Submit or update a 1–5 star rating for a published blog article.
 * Duplicate submissions from the same clientId update the prior rating
 * instead of inventing extra anonymous votes.
 */
export const submitRating = mutation({
  args: {
    slug: v.string(),
    rating: v.number(),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const slug = normalizeSlug(args.slug);
    const rating = normalizeBlogRating(args.rating);
    const clientId = normalizeBlogClientId(args.clientId);
    if (!slug || rating == null || !clientId) {
      return { ok: false as const, error: "invalid_rating" as const };
    }

    const now = Date.now();
    const existingVote = await ctx.db
      .query("blogPostRatings")
      .withIndex("by_slug_client", (q) => q.eq("slug", slug).eq("clientId", clientId))
      .unique();

    if (existingVote && existingVote.rating === rating) {
      const stats = await ctx.db
        .query("blogPostStats")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      return {
        ok: true as const,
        updated: false as const,
        viewerRating: rating,
        ...ratingFromRow(stats),
      };
    }

    const stats = await ctx.db
      .query("blogPostStats")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    const previous = existingVote?.rating ?? null;
    const nextAgg = applyBlogRatingDelta({
      ratingSum: stats?.ratingSum ?? 0,
      ratingCount: stats?.ratingCount ?? 0,
      next: rating,
      previous,
    });

    if (existingVote) {
      await ctx.db.patch(existingVote._id, { rating, updatedAt: now });
    } else {
      await ctx.db.insert("blogPostRatings", {
        slug,
        clientId,
        rating,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (stats) {
      await ctx.db.patch(stats._id, {
        ratingSum: nextAgg.ratingSum,
        ratingCount: nextAgg.ratingCount,
        ratingAvg: nextAgg.ratingAvg,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("blogPostStats", {
        slug,
        viewCount: 0,
        ratingSum: nextAgg.ratingSum,
        ratingCount: nextAgg.ratingCount,
        ratingAvg: nextAgg.ratingAvg,
        updatedAt: now,
      });
    }

    return {
      ok: true as const,
      updated: previous != null,
      viewerRating: rating,
      ...nextAgg,
    };
  },
});
