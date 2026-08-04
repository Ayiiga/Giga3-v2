import { getPostMediaKind } from "@/lib/gigasocial/postMedia";
import type { SocialPost } from "@/lib/gigasocial/types";

export const STORIES_REEL_MIN_COUNT = 3;
export const STORIES_REEL_FETCH_LIMIT = 24;

/** Story marker used by the Story composer for photo + video posts. */
export function postHasStoryMarker(post: SocialPost): boolean {
  const tags = post.hashtags ?? [];
  if (tags.some((tag) => tag.replace(/^#/, "").toLowerCase() === "story")) {
    return true;
  }
  return /(?:^|\s)#story\b/i.test(post.body ?? "");
}

/**
 * Public posts eligible for the Stories ring.
 * - Videos always qualify (existing reels behavior)
 * - Images / galleries / photo+music qualify when tagged #story
 */
export function isStoryEligiblePost(post: SocialPost): boolean {
  if (post.visibility === "followers") return false;
  const kind = getPostMediaKind(post);
  if (kind === "video") return true;
  if (kind === "image" || kind === "gallery" || kind === "photo-music") {
    return postHasStoryMarker(post);
  }
  return false;
}

/** Public image or video posts suitable for Stories/Reels preview. */
export function extractStoryReels(
  posts: SocialPost[],
  limit = STORIES_REEL_FETCH_LIMIT
): SocialPost[] {
  return posts
    .filter(isStoryEligiblePost)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

export function getStoryReelIds(posts: SocialPost[]): string[] {
  return extractStoryReels(posts).map((post) => post._id);
}
