import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { DEFAULT_UPLOAD_LIMITS } from "./uploadLimits";
import { isSubscriptionActive } from "./creditsConfig";
import type { SubscriptionPlanId } from "./subscriptionPlans";

/** Fast max-bytes lookup for acceptMessage — avoids a public query round-trip. */
export const getMaxFileBytesForUserInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userId.trim().toLowerCase()))
      .first();
    const rawPlan = (user?.subscriptionPlan ?? "free") as SubscriptionPlanId;
    const planId = isSubscriptionActive(rawPlan, user?.subscriptionExpiresAt)
      ? rawPlan
      : "free";
    const defaults = DEFAULT_UPLOAD_LIMITS[planId] ?? DEFAULT_UPLOAD_LIMITS.free;
    const override = await ctx.db
      .query("uploadLimitSettings")
      .withIndex("by_plan", (q) => q.eq("planId", planId))
      .first();
    return override?.maxFileBytes ?? defaults.maxFileBytes;
  },
});
