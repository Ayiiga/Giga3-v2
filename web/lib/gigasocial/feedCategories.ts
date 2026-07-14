import { getPostMediaKind } from "@/lib/gigasocial/postMedia";
import type { SocialPost } from "@/lib/gigasocial/types";
import type { SocialPostTypeId } from "@/lib/gigasocial/sections";

export type FeedCategoryId =
  | "for-you"
  | "following"
  | "trending"
  | "recent"
  | "videos"
  | "photos"
  | "music"
  | "education"
  | "business"
  | "ai"
  | "marketplace"
  | "communities"
  | "saved"
  | "trending-africa"
  | "sports"
  | "entertainment"
  | "creator-zone";

export const FEED_CATEGORIES: { id: FeedCategoryId; label: string; emoji: string }[] = [
  { id: "for-you", label: "For You", emoji: "✨" },
  { id: "following", label: "Following", emoji: "👥" },
  { id: "trending", label: "Trending", emoji: "🔥" },
  { id: "recent", label: "Recent", emoji: "🕐" },
  { id: "videos", label: "Videos", emoji: "🎬" },
  { id: "photos", label: "Photos", emoji: "📷" },
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "education", label: "Education", emoji: "📚" },
  { id: "business", label: "Business", emoji: "💼" },
  { id: "ai", label: "AI", emoji: "🤖" },
  { id: "marketplace", label: "Marketplace", emoji: "🛒" },
  { id: "communities", label: "Communities", emoji: "🌍" },
  { id: "saved", label: "Saved", emoji: "🔖" },
];

const CATEGORY_HASHTAGS: Record<
  Exclude<
    FeedCategoryId,
    | "for-you"
    | "following"
    | "trending"
    | "recent"
    | "videos"
    | "photos"
    | "music"
    | "saved"
    | "trending-africa"
    | "communities"
  >,
  string[]
> = {
  sports: ["sports", "football", "soccer", "afcon", "fitness", "athletics"],
  education: ["education", "learn", "study", "school", "gigalearn", "tutorial"],
  business: ["business", "startup", "entrepreneur", "finance", "africa", "trade"],
  entertainment: ["entertainment", "music", "comedy", "movie", "viral", "fun"],
  "creator-zone": ["creator", "content", "studio", "brand", "collab"],
  ai: ["ai", "gpt", "machinelearning", "artificialintelligence", "giga3"],
  marketplace: ["marketplace", "shop", "sell", "product", "store", "listing"],
};

function engagementScore(post: SocialPost): number {
  return (
    (post.likeCount ?? 0) * 3 +
    (post.commentCount ?? 0) * 4 +
    (post.shareCount ?? 0) * 5 +
    (post.viewCount ?? 0) * 0.1
  );
}

function matchesHashtagCategory(post: SocialPost, needles: string[]): boolean {
  const hashtagHit = post.hashtags?.some((tag) =>
    needles.some((needle) => tag.toLowerCase().includes(needle))
  );
  const bodyHit = needles.some((needle) => post.body.toLowerCase().includes(`#${needle}`));
  return Boolean(hashtagHit || bodyHit);
}

export function filterPostsByFeedCategory(
  posts: SocialPost[],
  category: FeedCategoryId
): SocialPost[] {
  switch (category) {
    case "for-you":
    case "recent":
      return posts;
    case "trending":
    case "trending-africa":
      return [...posts].sort((a, b) => engagementScore(b) - engagementScore(a));
    case "videos":
      return posts.filter((post) => getPostMediaKind(post) === "video");
    case "photos":
      return posts.filter((post) => {
        const kind = getPostMediaKind(post);
        return kind === "image" || kind === "gallery";
      });
    case "music":
      return posts.filter((post) => {
        const kind = getPostMediaKind(post);
        return kind === "audio" || kind === "photo-music";
      });
    case "ai":
      return posts.filter(
        (post) =>
          post.postType === "ai" || matchesHashtagCategory(post, CATEGORY_HASHTAGS.ai)
      );
    case "marketplace":
      return posts.filter(
        (post) =>
          matchesHashtagCategory(post, CATEGORY_HASHTAGS.marketplace) ||
          post.body.toLowerCase().includes("marketplace")
      );
    case "communities":
      return posts.filter((post) => Boolean(post.communitySlug));
    case "education": {
      const tags = CATEGORY_HASHTAGS.education;
      return posts.filter(
        (post) =>
          post.postType === "education" ||
          post.communitySlug === "education" ||
          matchesHashtagCategory(post, tags)
      );
    }
    case "business":
      return posts.filter((post) => matchesHashtagCategory(post, CATEGORY_HASHTAGS.business));
    case "sports":
      return posts.filter((post) => matchesHashtagCategory(post, CATEGORY_HASHTAGS.sports));
    case "entertainment":
      return posts.filter((post) =>
        matchesHashtagCategory(post, CATEGORY_HASHTAGS.entertainment)
      );
    case "creator-zone": {
      const tags = CATEGORY_HASHTAGS["creator-zone"];
      const postTypes: SocialPostTypeId[] = ["creator", "video", "image"];
      return posts.filter(
        (post) =>
          postTypes.includes(post.postType) || matchesHashtagCategory(post, tags)
      );
    }
    case "following":
    case "saved":
      return posts;
    default:
      return posts;
  }
}

export function feedCategoryNeedsFollowingFeed(category: FeedCategoryId): boolean {
  return category === "following";
}

export function feedCategoryNeedsSavedFeed(category: FeedCategoryId): boolean {
  return category === "saved";
}
