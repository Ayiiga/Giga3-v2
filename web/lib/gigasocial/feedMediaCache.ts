/**
 * Feed / Reels media cache — reuses the stories IDB store so previously
 * viewed posts reopen from disk offline without a second schema.
 */

import {
  cacheViewedStoryMedia,
  getCachedStoryIds,
  isStoryMediaCached,
  pruneStoriesMediaCache,
} from "@/lib/gigasocial/storiesMediaCache";
import { getPostMediaKind, getPostMediaUrls } from "@/lib/gigasocial/postMedia";
import type { SocialPost } from "@/lib/gigasocial/types";

/** Prefetch thumbnails + media for the first N feed rows while online. */
export const FEED_PREFETCH_COUNT = 6;

export async function cacheFeedPostMedia(post: SocialPost): Promise<boolean> {
  return cacheViewedStoryMedia(post);
}

export async function isFeedPostMediaCached(postId: string): Promise<boolean> {
  return isStoryMediaCached(postId);
}

export async function getCachedFeedPostIds(): Promise<Set<string>> {
  return getCachedStoryIds();
}

/** Warm cache for nearby posts (thumbnails + media) without blocking the UI. */
export function prefetchFeedMedia(posts: SocialPost[], limit = FEED_PREFETCH_COUNT): void {
  if (typeof window === "undefined" || !navigator.onLine) return;
  const targets = posts.slice(0, limit).filter((post) => {
    const kind = getPostMediaKind(post);
    return (
      kind === "video" ||
      kind === "image" ||
      kind === "gallery" ||
      kind === "photo-music"
    );
  });

  void (async () => {
    for (const post of targets) {
      try {
        // Prefer thumbnail first for instant posters, then full media.
        const thumb = post.videoThumbnailUrl;
        if (thumb) {
          const img = new Image();
          img.decoding = "async";
          img.src = thumb;
        }
        const mediaUrl = getPostMediaUrls(post)[0];
        if (mediaUrl && "caches" in window) {
          const cache = await caches.open("giga3-feed-media-http-v1");
          const hit = await cache.match(mediaUrl);
          if (!hit) {
            const response = await fetch(mediaUrl, {
              credentials: "omit",
              cache: "force-cache",
              mode: "cors",
            }).catch(() => null);
            if (response?.ok) await cache.put(mediaUrl, response.clone());
          }
        }
        await cacheFeedPostMedia(post);
      } catch {
        /* best-effort prefetch */
      }
    }
  })();
}

export async function pruneFeedMediaCache(activePostIds: string[]): Promise<void> {
  const active = new Set(activePostIds);
  const cached = await getCachedFeedPostIds();
  await pruneStoriesMediaCache({
    activePostIds: active,
    viewedPostIds: cached,
  });
}
