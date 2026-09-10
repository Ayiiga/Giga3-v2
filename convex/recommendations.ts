import { query } from "./_generated/server";
import { v } from "convex/values";
import { tryRequireSession } from "./auth";
import { computeEntitlements } from "./entitlements";
import { normalizeUserId } from "./userIds";
import { sessionArgs } from "./validators";
import {
  buildRecommendations,
  RECOMMENDATION_PROMPT,
  type RecommendationSurface,
} from "./recommendationsLogic";

export { RECOMMENDATION_PROMPT, buildRecommendations };
export type {
  RecommendationEntitlement,
  RecommendationItem,
  RecommendationSurface,
} from "./recommendationsLogic";

const surfaceValidator = v.union(
  v.literal("chat"),
  v.literal("learn"),
  v.literal("social"),
  v.literal("edit"),
  v.literal("studio"),
  v.literal("marketplace")
);

export const getRecommendations = query({
  args: {
    ...sessionArgs,
    surface: surfaceValidator,
    currentPersonaId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const email = await tryRequireSession(args.sessionToken);
    const limit = args.limit ?? 4;
    let entitlements = null;
    let creditsLeft: number | null = null;
    let recentTopics: string[] = [];

    if (email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
      if (user) {
        entitlements = computeEntitlements(user);
        creditsLeft = user.credits ?? 0;
      }

      const normalized = normalizeUserId(email);
      const conversations = await ctx.db
        .query("conversations")
        .withIndex("by_user_updated", (q) => q.eq("userId", normalized))
        .order("desc")
        .take(5);
      recentTopics = conversations
        .map((row) => row.title.trim())
        .filter((title) => title.length > 0 && title !== "New chat")
        .slice(0, 5);
    }

    const recommendations = buildRecommendations({
      surface: args.surface as RecommendationSurface,
      currentPersonaId: args.currentPersonaId,
      limit,
      entitlements,
      creditsLeft,
      recentTopics,
    });

    return { recommendations };
  },
});
