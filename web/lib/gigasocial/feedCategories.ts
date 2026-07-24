import { sortPostsForYou, type FeedRankingContext } from "@/lib/gigasocial/feedRanking";
import { getPostMediaKind } from "@/lib/gigasocial/postMedia";
import type { SocialPost } from "@/lib/gigasocial/types";
import type { SocialPostTypeId } from "@/lib/gigasocial/sections";

export type FeedCategoryId =
  | "for-you"
  | "following"
  | "trending"
  | "nearby"
  | "ai-picks"
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
  | "football"
  | "entertainment"
  | "comedy"
  | "technology"
  | "students"
  | "teachers"
  | "churches"
  | "gaming"
  | "live-now"
  | "creator-zone";

export const FEED_CATEGORIES: { id: FeedCategoryId; label: string; emoji: string }[] = [
  { id: "recent", label: "Newest", emoji: "🕐" },
  { id: "for-you", label: "For You", emoji: "✨" },
  { id: "following", label: "Following", emoji: "👥" },
  { id: "trending", label: "Trending", emoji: "🔥" },
  { id: "nearby", label: "Nearby", emoji: "📍" },
  { id: "ai-picks", label: "AI Picks", emoji: "🤖" },
  { id: "football", label: "Football", emoji: "⚽" },
  { id: "education", label: "Education", emoji: "📚" },
  { id: "technology", label: "Technology", emoji: "💻" },
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "comedy", label: "Comedy", emoji: "😂" },
  { id: "business", label: "Business", emoji: "💼" },
  { id: "students", label: "Students", emoji: "🎓" },
  { id: "teachers", label: "Teachers", emoji: "🍎" },
  { id: "churches", label: "Churches", emoji: "⛪" },
  { id: "gaming", label: "Gaming", emoji: "🎮" },
  { id: "live-now", label: "Live Now", emoji: "🔴" },
  { id: "videos", label: "Videos", emoji: "🎬" },
  { id: "photos", label: "Photos", emoji: "📷" },
  { id: "ai", label: "AI", emoji: "✦" },
  { id: "marketplace", label: "Marketplace", emoji: "🛒" },
  { id: "communities", label: "Communities", emoji: "🌍" },
  { id: "saved", label: "Saved", emoji: "🔖" },
];

const CATEGORY_HASHTAGS: Record<string, string[]> = {
  sports: ["sports", "football", "soccer", "afcon", "fitness", "athletics"],
  football: ["football", "soccer", "afcon", "premierleague", "worldcup", "matchday"],
  education: ["education", "learn", "study", "school", "gigalearn", "tutorial"],
  business: ["business", "startup", "entrepreneur", "finance", "africa", "trade"],
  entertainment: ["entertainment", "music", "comedy", "movie", "viral", "fun"],
  comedy: ["comedy", "funny", "skit", "humor", "laugh"],
  technology: ["tech", "technology", "coding", "software", "gadget", "ai"],
  students: ["student", "campus", "university", "exam", "lecture"],
  teachers: ["teacher", "tutor", "classroom", "lesson", "educator"],
  churches: ["church", "gospel", "faith", "sermon", "worship", "prayer"],
  gaming: ["gaming", "gamer", "esports", "playstation", "xbox", "mobilegame"],
  "creator-zone": ["creator", "content", "studio", "brand", "collab"],
  ai: ["ai", "gpt", "machinelearning", "artificialintelligence", "giga3"],
  marketplace: ["marketplace", "shop", "sell", "product", "store", "listing"],
  nearby: ["local", "nearby", "community", "neighborhood", "ghana", "nigeria", "kenya"],
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
  const plainHit = needles.some((needle) => post.body.toLowerCase().includes(needle));
  return Boolean(hashtagHit || bodyHit || plainHit);
}

export function filterPostsByFeedCategory(
  posts: SocialPost[],
  category: FeedCategoryId,
  rankingCtx?: FeedRankingContext
): SocialPost[] {
  switch (category) {
    case "for-you":
      return rankingCtx ? sortPostsForYou(posts, rankingCtx) : posts;
    case "ai-picks":
      return sortPostsForYou(
        posts.filter(
          (post) =>
            post.postType === "ai" ||
            matchesHashtagCategory(post, CATEGORY_HASHTAGS.ai) ||
            engagementScore(post) > 0
        ),
        rankingCtx ?? { interestKeywords: ["ai", "learn", "creator"] }
      );
    case "nearby":
      return posts.filter((post) => matchesHashtagCategory(post, CATEGORY_HASHTAGS.nearby));
    case "recent":
      return [...posts].sort((a, b) => {
        const aPin = a.pinnedAt ? 1 : 0;
        const bPin = b.pinnedAt ? 1 : 0;
        if (aPin !== bPin) return bPin - aPin;
        return b.createdAt - a.createdAt;
      });
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
        if (kind === "audio" || kind === "photo-music") return true;
        if (
          post.mediaItems?.some(
            (item) => item.type === "audio" || item.filterId === "photo-music"
          )
        ) {
          return true;
        }
        const body = post.body.toLowerCase();
        return (
          body.includes("🎵") ||
          Boolean(post.hashtags?.some((tag) => tag.toLowerCase() === "photomusic"))
        );
      });
    case "live-now":
      return posts.filter(
        (post) =>
          post.body.toLowerCase().includes("live") ||
          post.hashtags?.some((tag) => tag.toLowerCase().includes("live"))
      );
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
    case "education":
    case "business":
    case "sports":
    case "football":
    case "entertainment":
    case "comedy":
    case "technology":
    case "students":
    case "teachers":
    case "churches":
    case "gaming": {
      const tags = CATEGORY_HASHTAGS[category] ?? [];
      if (category === "education") {
        return posts.filter(
          (post) =>
            post.postType === "education" ||
            post.communitySlug === "education" ||
            matchesHashtagCategory(post, tags)
        );
      }
      return posts.filter((post) => matchesHashtagCategory(post, tags));
    }
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
