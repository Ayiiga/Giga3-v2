import type { SocialComment, SocialPost } from "@/lib/gigasocial/types";

/** Newest first, with creator-pinned items floated to the top. */
export function compareNewestWithPins(
  a: { createdAt: number; pinnedAt?: number },
  b: { createdAt: number; pinnedAt?: number }
): number {
  const aPin = a.pinnedAt ? 1 : 0;
  const bPin = b.pinnedAt ? 1 : 0;
  if (aPin !== bPin) return bPin - aPin;
  if (a.pinnedAt && b.pinnedAt && a.pinnedAt !== b.pinnedAt) {
    return b.pinnedAt - a.pinnedAt;
  }
  return b.createdAt - a.createdAt;
}

export function sortPostsNewestFirst(posts: SocialPost[]): SocialPost[] {
  return [...posts].sort(compareNewestWithPins);
}

export function sortCommentsNewestWithPins(comments: SocialComment[]): SocialComment[] {
  return [...comments].sort(compareNewestWithPins);
}
