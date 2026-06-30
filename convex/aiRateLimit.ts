import { RateLimitError } from "./securityErrors";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { AiProviderTier } from "./providerRouter";

type DbCtx = { db: any };

const WINDOW_MS = Number(process.env.AI_RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000;
const FREE_MAX = Number(process.env.AI_RATE_LIMIT_FREE_PER_HOUR) || 40;
const PREMIUM_MAX = Number(process.env.AI_RATE_LIMIT_PREMIUM_PER_HOUR) || 200;

function bucketKey(userId: string): string {
  return `ai:${userId}`;
}

async function consumeAiRateLimitDb(
  ctx: DbCtx,
  userId: string,
  tier: AiProviderTier
): Promise<void> {
  const max = tier === "premium" ? PREMIUM_MAX : FREE_MAX;
  const now = Date.now();
  const key = bucketKey(userId);
  const existing = await ctx.db
    .query("feedbackRateLimits")
    .withIndex("by_bucket", (q: any) => q.eq("bucketKey", key))
    .first();

  if (!existing || now - existing.windowStartMs > WINDOW_MS) {
    if (existing) {
      await ctx.db.patch(existing._id, { windowStartMs: now, count: 1 });
    } else {
      await ctx.db.insert("feedbackRateLimits", {
        bucketKey: key,
        windowStartMs: now,
        count: 1,
      });
    }
    return;
  }

  if (existing.count >= max) {
    throw new RateLimitError(
      tier === "premium"
        ? "Premium AI rate limit reached. Please wait a few minutes."
        : "Free AI rate limit reached. Upgrade or wait before sending more messages."
    );
  }

  await ctx.db.patch(existing._id, { count: existing.count + 1 });
}

export const consumeAiRateLimitInternal = internalMutation({
  args: {
    userId: v.string(),
    tier: v.union(v.literal("free"), v.literal("premium")),
  },
  handler: async (ctx, args) => {
    await consumeAiRateLimitDb(ctx, args.userId, args.tier);
  },
});
