import { getPostMediaKind } from "@/lib/gigasocial/postMedia";
import type { SocialPost } from "@/lib/gigasocial/types";

export const STORIES_REEL_MIN_COUNT = 3;
export const STORIES_REEL_FETCH_LIMIT = 24;

/** Public video posts suitable for Stories/Reels preview. */
export function extractStoryReels(
  posts: SocialPost[],
  limit = STORIES_REEL_FETCH_LIMIT
): SocialPost[] {
  return posts
    .filter((post) => {
      if (post.visibility === "followers") return false;
      return getPostMediaKind(post) === "video";
    })
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

export function getStoryReelIds(posts: SocialPost[]): string[] {
  return extractStoryReels(posts).map((post) => post._id);
}
