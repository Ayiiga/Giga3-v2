"use node";

import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireSessionWithMonitoring } from "./auth";
import { isLiveNewsEnabled } from "./featureFlags";
import { fetchCategoryHeadlines as fetchCategoryHeadlinesImpl } from "./liveNewsFetch";
import {
  LIVE_NEWS_CATEGORIES,
  type LiveNewsHeadline,
} from "./liveNewsShared";

export { LIVE_NEWS_CATEGORIES, type LiveNewsHeadline, type LiveNewsCategoryId } from "./liveNewsShared";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const STALE_MS = 60 * 60 * 1000;

/** Refresh all category caches (cron + on-demand). */
export const refreshLiveNewsCache = internalAction({
  args: {},
  handler: async (ctx) => {
    if (!isLiveNewsEnabled()) return { refreshed: 0 };

    let refreshed = 0;
    for (const category of LIVE_NEWS_CATEGORIES) {
      const items = await fetchCategoryHeadlinesImpl(category, 4);
      await ctx.runMutation(internal.liveNewsInternal.upsertCategoryCache, {
        category: category.id,
        itemsJson: JSON.stringify(items),
        fetchedAt: Date.now(),
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      refreshed += 1;
    }

    await ctx.runAction(internal.pushAlertsActions.notifyFromLiveNewsRefresh, {});
    return { refreshed };
  },
});

/** Headlines by category from cache (refreshes stale cache in background). */
export const fetchHeadlines = action({
  args: {
    sessionToken: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSessionWithMonitoring(args.sessionToken, ctx, "liveNews.fetch");
    if (!isLiveNewsEnabled()) {
      throw new Error("Live news is temporarily unavailable.");
    }

    const categoryFilter = args.category?.trim().toLowerCase();
    const categories = categoryFilter
      ? LIVE_NEWS_CATEGORIES.filter((c) => c.id === categoryFilter)
      : LIVE_NEWS_CATEGORIES;

    const now = Date.now();
    let needsRefresh = false;
    const results: LiveNewsHeadline[] = [];

    for (const cat of categories) {
      const cached = await ctx.runQuery(internal.liveNewsInternal.readCategoryCache, {
        category: cat.id,
      });
      if (!cached || cached.expiresAt <= now) {
        needsRefresh = true;
        continue;
      }
      if (now - cached.fetchedAt > STALE_MS) {
        needsRefresh = true;
      }
      const items = JSON.parse(cached.itemsJson) as LiveNewsHeadline[];
      results.push(...items);
    }

    if (needsRefresh) {
      await ctx.scheduler.runAfter(0, internal.liveNews.refreshLiveNewsCache, {});
    }

    if (results.length === 0 && needsRefresh) {
      const cat = categories[0] ?? LIVE_NEWS_CATEGORIES[0];
      const fresh = await fetchCategoryHeadlinesImpl(cat, 4);
      return {
        fetchedAt: Date.now(),
        headlines: fresh,
        categories: LIVE_NEWS_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
        cacheStatus: "warming" as const,
      };
    }

    results.sort((a, b) => {
      const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return tb - ta;
    });

    return {
      fetchedAt: now,
      headlines: results.slice(0, 36),
      categories: LIVE_NEWS_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
      cacheStatus: needsRefresh ? ("stale_refresh_scheduled" as const) : ("fresh" as const),
    };
  },
});
