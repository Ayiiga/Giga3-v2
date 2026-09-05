import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 120;

function normalizeSlug(slug: string): string | null {
  const normalized = slug.trim().toLowerCase();
  if (!normalized || normalized.length > MAX_SLUG_LENGTH) return null;
  if (!SLUG_PATTERN.test(normalized)) return null;
  return normalized;
}

export const getStats = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const slug = normalizeSlug(args.slug);
    if (!slug) return { viewCount: 0 };

    const row = await ctx.db
      .query("blogPostStats")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    return { viewCount: row?.viewCount ?? 0 };
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

    await ctx.db.insert("blogPostStats", { slug, viewCount: 1, updatedAt: now });
    return { ok: true as const, viewCount: 1 };
  },
});
