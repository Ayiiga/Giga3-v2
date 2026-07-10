import type { SocialPost } from "@/lib/gigasocial/types";
import type { SocialPostTypeId } from "@/lib/gigasocial/sections";

export type FeedCategoryId =
  | "for-you"
  | "trending-africa"
  | "sports"
  | "education"
  | "business"
  | "entertainment"
  | "creator-zone";

export const FEED_CATEGORIES: { id: FeedCategoryId; label: string; emoji: string }[] = [
  { id: "for-you", label: "For You", emoji: "✨" },
  { id: "trending-africa", label: "Trending Africa", emoji: "🌍" },
  { id: "sports", label: "Sports", emoji: "⚽" },
  { id: "education", label: "Education", emoji: "📚" },
  { id: "business", label: "Business", emoji: "💼" },
  { id: "entertainment", label: "Entertainment", emoji: "🎬" },
  { id: "creator-zone", label: "Creator Zone", emoji: "🎨" },
];

const CATEGORY_HASHTAGS: Record<Exclude<FeedCategoryId, "for-you" | "trending-africa">, string[]> = {
  sports: ["sports", "football", "soccer", "afcon", "fitness", "athletics"],
  education: ["education", "learn", "study", "school", "gigalearn", "tutorial"],
  business: ["business", "startup", "entrepreneur", "finance", "africa", "trade"],
  entertainment: ["entertainment", "music", "comedy", "movie", "viral", "fun"],
  "creator-zone": ["creator", "content", "studio", "brand", "collab"],
};

function engagementScore(post: SocialPost): number {
  return (
    (post.likeCount ?? 0) * 3 +
    (post.commentCount ?? 0) * 4 +
    (post.shareCount ?? 0) * 5 +
    (post.viewCount ?? 0) * 0.1
  );
}

export function filterPostsByFeedCategory(
  posts: SocialPost[],
  category: FeedCategoryId
): SocialPost[] {
  if (category === "for-you") return posts;

  if (category === "trending-africa") {
    return [...posts].sort((a, b) => engagementScore(b) - engagementScore(a));
  }

  const tags = CATEGORY_HASHTAGS[category];
  const postTypes: SocialPostTypeId[] =
    category === "education"
      ? ["education"]
      : category === "creator-zone"
        ? ["creator", "video", "image"]
        : [];

  return posts.filter((post) => {
    const hashtagHit = post.hashtags?.some((tag) =>
      tags.some((needle) => tag.toLowerCase().includes(needle))
    );
    const typeHit = postTypes.includes(post.postType);
    const bodyHit = tags.some((needle) => post.body.toLowerCase().includes(`#${needle}`));
    return hashtagHit || typeHit || bodyHit;
  });
}
