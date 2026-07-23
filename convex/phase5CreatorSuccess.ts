import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import { isPhase5FlagEnabled } from "./phase5Controls";

/** Lightweight local helpers — no external AI call (cost-safe). */
export function suggestCaptions(prompt: string): string[] {
  const base = prompt.trim().replace(/\s+/g, " ").slice(0, 120);
  if (!base) {
    return [
      "Fresh from the studio — what do you think?",
      "Made with Giga3 AI. Feedback welcome.",
      "New drop for the community.",
    ];
  }
  return [
    `${base} — crafted with Giga3.`,
    `Behind the scenes: ${base}`,
    `${base}. Tag a friend who needs this.`,
  ];
}

export function suggestHashtags(prompt: string): string[] {
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4)
    .slice(0, 4);
  const tags = new Set<string>(["#Giga3", "#MadeWithAI", "#AfricaCreates"]);
  for (const w of words) tags.add(`#${w.replace(/^\w/, (c) => c.toUpperCase())}`);
  return Array.from(tags).slice(0, 8);
}

function hourBucket(ts: number): number {
  return new Date(ts).getUTCHours();
}

/** Creator analytics + AI caption/hashtag suggestions (privacy-safe aggregates). */
export const getCreatorSuccessInsights = query({
  args: {
    ...sessionArgs,
    draftPrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await isPhase5FlagEnabled(ctx, "phase5.creator_success"))) {
      return { enabled: false as const };
    }
    const userId = await requireSession(args.sessionToken);
    const posts = await ctx.db
      .query("socialPosts")
      .withIndex("by_author_created", (q) => q.eq("authorId", userId))
      .order("desc")
      .take(40);

    const hourCounts = new Array(24).fill(0) as number[];
    let totalLikes = 0;
    let totalComments = 0;
    for (const post of posts) {
      hourCounts[hourBucket(post.createdAt)] += 1;
      totalLikes += post.likeCount ?? 0;
      totalComments += post.commentCount ?? 0;
    }
    let bestHour = 0;
    for (let h = 0; h < 24; h += 1) {
      if (hourCounts[h] > hourCounts[bestHour]) bestHour = h;
    }

    const draft = args.draftPrompt ?? posts[0]?.body ?? "";
    return {
      enabled: true as const,
      metrics: {
        postsSampled: posts.length,
        totalLikes,
        totalComments,
        avgEngagement:
          posts.length > 0
            ? Math.round(((totalLikes + totalComments) / posts.length) * 10) / 10
            : 0,
        bestPostingHourUtc: bestHour,
      },
      captions: suggestCaptions(draft),
      hashtags: suggestHashtags(draft),
      badges: [
        posts.length >= 1 ? "First post" : null,
        posts.length >= 10 ? "Consistent creator" : null,
        totalLikes >= 50 ? "Crowd favorite" : null,
      ].filter(Boolean) as string[],
    };
  },
});
