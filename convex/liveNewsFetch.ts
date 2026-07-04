"use node";

import { parseFeedItems, type NewsFeedItem } from "./creatorNews";
import {
  LIVE_NEWS_CATEGORIES,
  type CategoryConfig,
  type LiveNewsHeadline,
} from "./liveNewsShared";

async function fetchCategoryFeed(
  feed: CategoryConfig["feeds"][number],
  limit: number
): Promise<NewsFeedItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Giga3LiveNews/1.0 (+https://www.giga3ai.com)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseFeedItems(xml, feed.source, "News", limit);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchCategoryHeadlines(
  category: CategoryConfig,
  perFeed = 4
): Promise<LiveNewsHeadline[]> {
  const batches = await Promise.all(
    category.feeds.map((feed) => fetchCategoryFeed(feed, perFeed))
  );
  const seen = new Set<string>();
  const headlines: LiveNewsHeadline[] = [];

  for (const batch of batches) {
    for (const item of batch) {
      const key = item.title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      headlines.push({ ...item, category: category.id });
    }
  }

  headlines.sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });

  return headlines.slice(0, 12);
}

export { LIVE_NEWS_CATEGORIES };
