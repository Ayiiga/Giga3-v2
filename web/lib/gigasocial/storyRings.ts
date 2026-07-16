import type { SocialPost } from "@/lib/gigasocial/types";

export const STORY_RING_AUTHOR_LIMIT = 3;
export const STORY_RING_REELS_PER_AUTHOR = 3;

export type StoryRingItem = {
  id: string;
  label: string;
  avatarUrl?: string | null;
  hasUnviewed: boolean;
  reelIndex: number;
};

export function buildStoryRingItems(
  reels: SocialPost[],
  viewedIds: Set<string>
): StoryRingItem[] {
  if (!reels.length) return [];

  const byAuthor = new Map<string, { post: SocialPost; index: number }>();
  reels.forEach((post, index) => {
    const key = post.author.handle || post.author.displayName;
    if (!byAuthor.has(key)) byAuthor.set(key, { post, index });
  });

  const community: StoryRingItem = {
    id: "community",
    label: "Community",
    avatarUrl: reels[0]?.author.avatarUrl,
    hasUnviewed: reels.some((post) => !viewedIds.has(post._id)),
    reelIndex: 0,
  };

  const creators = [...byAuthor.values()].slice(0, STORY_RING_AUTHOR_LIMIT).map(({ post, index }) => ({
    id: post.author.handle || post._id,
    label: post.author.displayName,
    avatarUrl: post.author.avatarUrl,
    hasUnviewed: reelsForAuthor(reels, post.author.handle, post.author.displayName).some(
      (reel) => !viewedIds.has(reel._id)
    ),
    reelIndex: index,
  }));

  return [community, ...creators];
}

export function reelsForAuthor(
  reels: SocialPost[],
  handle?: string,
  displayName?: string
): SocialPost[] {
  const key = handle || displayName;
  if (!key) return [];
  return reels
    .filter(
      (post) =>
        post.author.handle === handle ||
        (!handle && post.author.displayName === displayName) ||
        post.author.handle === key ||
        post.author.displayName === key
    )
    .slice(0, STORY_RING_REELS_PER_AUTHOR);
}

export function reelsForStoryRing(reels: SocialPost[], ringId: string): SocialPost[] {
  if (ringId === "community") return reels;
  const match = reels.find(
    (post) => post.author.handle === ringId || post._id === ringId
  );
  if (!match) return reels;
  const authorReels = reelsForAuthor(reels, match.author.handle, match.author.displayName);
  return authorReels.length ? authorReels : reels;
}

export function storyRingStartIndex(reels: SocialPost[], ringId: string): number {
  if (ringId === "community") return 0;
  const index = reels.findIndex(
    (post) => post.author.handle === ringId || post._id === ringId
  );
  return index >= 0 ? index : 0;
}
