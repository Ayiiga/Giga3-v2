import type { SocialPost } from "@/lib/gigasocial/types";

export type FeedRankingContext = {
  now?: number;
  /** Prefer creators the viewer already supports. */
  affinityCreatorIds?: Set<string> | string[];
  /** Interest keywords from chat/profile learning. */
  interestKeywords?: string[];
  /** Prefer posts matching this language hint (hashtag/body). */
  languageHint?: string;
  /** Region / country keyword boost. */
  regionHint?: string;
  /** Slow networks prefer shorter / image-lighter posts slightly. */
  isSlowNetwork?: boolean;
  /** Hour of day 0–23 for time-of-day affinity. */
  hourOfDay?: number;
};

function toSet(ids?: Set<string> | string[]): Set<string> {
  if (!ids) return new Set();
  return ids instanceof Set ? ids : new Set(ids);
}

function watchTimeProxy(post: SocialPost): number {
  const duration = post.videoDurationSec ?? 0;
  const views = post.viewCount ?? 0;
  return duration > 0 ? Math.min(duration, 90) * Math.log10(views + 1) : views * 0.05;
}

/** Multi-signal score for intelligent For You ranking (client-side, additive). */
export function rankFeedPost(post: SocialPost, ctx: FeedRankingContext = {}): number {
  const now = ctx.now ?? Date.now();
  const ageHours = Math.max(0.25, (now - post.createdAt) / (1000 * 60 * 60));
  const affinity = toSet(ctx.affinityCreatorIds);
  const interests = (ctx.interestKeywords ?? []).map((k) => k.toLowerCase());

  let score = 0;
  score += watchTimeProxy(post) * 1.2;
  score += (post.shareCount ?? 0) * 6;
  score += (post.commentCount ?? 0) * 5;
  score += (post.likeCount ?? 0) * 3;
  score += (post.bookmarkedByMe ? 8 : 0);
  score += post.author.supportingByMe || affinity.has(post.author.userId ?? "") ? 14 : 0;

  const body = `${post.body} ${(post.hashtags ?? []).join(" ")}`.toLowerCase();
  for (const keyword of interests) {
    if (keyword && body.includes(keyword)) score += 5;
  }
  if (ctx.languageHint && body.includes(ctx.languageHint.toLowerCase())) score += 4;
  if (ctx.regionHint && body.includes(ctx.regionHint.toLowerCase())) score += 4;

  const hour = ctx.hourOfDay ?? new Date(now).getHours();
  const eveningBoost = hour >= 17 && hour <= 21 ? 3 : 0;
  score += eveningBoost;

  if (ctx.isSlowNetwork) {
    const kindHeavy =
      post.mediaType === "video" ||
      post.postType === "video" ||
      (post.mediaUrls?.length ?? 0) > 2;
    if (kindHeavy) score -= 4;
    else score += 2;
  }

  // Recency dampening — keep feed fresh without ignoring engagement.
  score = score / Math.pow(ageHours, 0.35);
  return score;
}

export function sortPostsForYou(
  posts: SocialPost[],
  ctx: FeedRankingContext = {}
): SocialPost[] {
  return [...posts].sort((a, b) => rankFeedPost(b, ctx) - rankFeedPost(a, ctx));
}

export function buildGrowthInsights(args: {
  todayViews: number;
  yesterdayViews?: number;
  engagementRate: number;
  topHashtags?: string[];
}): string[] {
  const insights: string[] = [];
  const yesterday = args.yesterdayViews ?? Math.max(1, Math.round(args.todayViews * 0.8));
  const delta =
    yesterday > 0
      ? Math.round(((args.todayViews - yesterday) / yesterday) * 100)
      : 0;
  if (delta !== 0) {
    insights.push(
      delta > 0
        ? `Your engagement increased ${delta}% today.`
        : `Views are ${Math.abs(delta)}% softer than yesterday — try a Story teaser.`
    );
  } else {
    insights.push("Steady day so far — a short Reel tonight can lift reach.");
  }
  insights.push("Try posting between 6 PM and 8 PM.");
  if (args.engagementRate >= 2) {
    insights.push("Audience is responsive — ask a question in your next caption.");
  }
  if (args.topHashtags?.length) {
    insights.push(`Lean into #${args.topHashtags[0]} — it matches your recent winners.`);
  } else {
    insights.push("Add 3–5 niche hashtags to improve discoverability.");
  }
  return insights.slice(0, 4);
}
