import { query } from "./_generated/server";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import { isPhase6FlagEnabled } from "./phase6Controls";

/** Creator ecosystem expansion — analytics + milestones (flag-gated). */
export const getCreatorEcosystemSummary = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    if (!(await isPhase6FlagEnabled(ctx, "phase6.creator_ecosystem"))) {
      return { enabled: false as const };
    }
    const userId = await requireSession(args.sessionToken);
    const profile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const posts = await ctx.db
      .query("socialPosts")
      .withIndex("by_author_created", (q) => q.eq("authorId", userId))
      .order("desc")
      .take(50);
    const boosts = await ctx.db
      .query("socialPostBoosts")
      .withIndex("by_creator_created", (q) => q.eq("creatorId", userId))
      .take(20);

    const likes = posts.reduce((s, p) => s + (p.likeCount ?? 0), 0);
    const comments = posts.reduce((s, p) => s + (p.commentCount ?? 0), 0);
    const milestones = [
      { id: "first_post", label: "First post", earned: posts.length >= 1 },
      { id: "ten_posts", label: "10 posts published", earned: posts.length >= 10 },
      { id: "verified", label: "Verified creator", earned: Boolean(profile?.verified) },
      { id: "campaign", label: "Ran a boost campaign", earned: boosts.length >= 1 },
      { id: "engagement", label: "100+ engagements", earned: likes + comments >= 100 },
    ];

    return {
      enabled: true as const,
      profile: profile
        ? {
            handle: profile.handle,
            verified: profile.verified,
            verificationStatus: profile.verificationStatus ?? "none",
            totalEarningsGhs: profile.totalEarningsGhs,
          }
        : null,
      audience: {
        posts: posts.length,
        likes,
        comments,
        avgEngagement:
          posts.length > 0
            ? Math.round(((likes + comments) / posts.length) * 10) / 10
            : 0,
      },
      campaigns: {
        total: boosts.length,
        active: boosts.filter((b) => b.status === "active" && b.endsAt > Date.now())
          .length,
        brandCollabReady: Boolean(profile?.verified) && posts.length >= 5,
      },
      milestones,
    };
  },
});
