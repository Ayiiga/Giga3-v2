import { internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  parseInterestProfile,
  serializeInterestProfile,
  updateInterestProfile,
} from "./userLearning";
import { isValidMode } from "./aiModes";
import { grantStarterCreditsIfNeeded } from "./userStarterCredits";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import { createSessionToken } from "./sessionAuth";
import { consumeAuthRateLimit } from "./authRateLimit";
import { SECURITY_EVENT_TYPES } from "./securityMonitoring";
import { RateLimitError, UnauthorizedError } from "./securityErrors";
import { resolveAiProviderTier } from "./providerRouter";
import { getFreeOpenAiSnapshotDb } from "./freeOpenAiQuota";
import { isSubscriptionActive } from "./creditsConfig";
import {
  isFreeImageGenerationEnabled,
  isLiveNewsEnabled,
  isPushAlertsEnabled,
  openAiImageRequiresSubscription,
} from "./featureFlags";
import { shouldOfferOpenAiImageGeneration } from "./premiumImage";

async function attachSessionToken<T extends Record<string, unknown>>(
  email: string,
  user: T
): Promise<T & { sessionToken: string }> {
  const sessionToken = await createSessionToken(email);
  return { ...user, sessionToken };
}

/** Bootstrap login — issues session token. Email verified via magic link when using Supabase. */
export const createUser = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    try {
      await consumeAuthRateLimit(ctx, `auth:create:${email}`);
    } catch (error) {
      if (error instanceof RateLimitError) {
        await ctx.db.insert("securityEvents", {
          eventType: SECURITY_EVENT_TYPES.RATE_LIMIT,
          severity: "medium",
          message: "Auth bootstrap rate limit exceeded",
          emailHash: email.slice(0, 64),
          dateKey: new Date().toISOString().slice(0, 10),
          createdAt: Date.now(),
        });
      }
      throw error;
    }
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existing) {
      if (existing.accountStatus === "suspended") {
        throw new Error("This account has been suspended. Contact support.");
      }
      const user = await grantStarterCreditsIfNeeded(ctx, email, existing);
      return await attachSessionToken(email, user);
    }

    const userId = await ctx.db.insert("users", {
      email,
      tokens: 12,
      plan: "free",
      tier: "free",
      subscriptionPlan: "free",
      credits: 0,
      starterCreditsGranted: false,
    });
    await ctx.runMutation(internal.platformStats.incrementRegisteredUserInternal, {});
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("Failed to create user");
    }
    const granted = await grantStarterCreditsIfNeeded(ctx, email, user);
    return await attachSessionToken(email, granted);
  },
});

export const refreshSession = mutation({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) throw new UnauthorizedError();
    const sessionToken = await createSessionToken(email);
    return { sessionToken };
  },
});

export const backfillMissingStarterCredits = mutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cap = Math.min(args.limit ?? 100, 500);
    const users = await ctx.db.query("users").take(cap * 3);
    let patched = 0;
    for (const user of users) {
      if (patched >= cap) break;
      if (user.starterCreditsGranted) continue;
      await grantStarterCreditsIfNeeded(ctx, user.email, user);
      patched += 1;
    }
    return { patched };
  },
});

export const getUser = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  },
});

export const getChatCredits = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return null;

    const hasPurchasedCredits = await ctx.db
      .query("creditLogs")
      .withIndex("by_user_created", (q) => q.eq("userId", email))
      .order("desc")
      .take(50)
      .then((rows) => rows.some((row) => row.action === "credit_purchase"));

    const aiTier = resolveAiProviderTier({
      subscriptionPlan: user.subscriptionPlan ?? "free",
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      hasPurchasedCredits,
    });

    const freeOpenAi = await getFreeOpenAiSnapshotDb(ctx, email);
    const isPremium = aiTier === "premium";
    const subscriptionActive = isSubscriptionActive(
      user.subscriptionPlan ?? "free",
      user.subscriptionExpiresAt
    );

    return {
      credits: user.credits ?? 0,
      aiTier,
      isPremium,
      subscriptionActive,
      canUseOpenAiImage: shouldOfferOpenAiImageGeneration(
        user.subscriptionPlan ?? "free",
        user.subscriptionExpiresAt
      ),
      freeImageGenerationEnabled: isFreeImageGenerationEnabled(),
      features: {
        liveNews: isLiveNewsEnabled(),
        pushAlerts: isPushAlertsEnabled(),
        openAiImageRequiresSubscription: openAiImageRequiresSubscription(),
      },
      freeOpenAiRemaining: isPremium ? freeOpenAi.limit : freeOpenAi.remaining,
      freeOpenAiLimit: freeOpenAi.limit,
      freeOpenAiResetsAt: freeOpenAi.resetsAt,
      hasOpenAiAccess: isPremium || freeOpenAi.remaining > 0,
    };
  },
});

export const getInterestProfile = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return null;
    return { interestProfile: user.interestProfile ?? null };
  },
});

const INTEREST_PROFILE_WRITE_INTERVAL = 5;

export const recordChatInteraction = mutation({
  args: {
    ...sessionArgs,
    mode: v.string(),
    messageContent: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return null;

    const safeMode = isValidMode(args.mode) ? args.mode : "general";
    const current = parseInterestProfile(user.interestProfile);
    const next = updateInterestProfile(current, safeMode, args.messageContent);
    const serialized = serializeInterestProfile(next);
    const shouldPersist =
      next.messageCount <= 5 ||
      next.messageCount % INTEREST_PROFILE_WRITE_INTERVAL === 0 ||
      serialized !== (user.interestProfile ?? "");
    if (shouldPersist) {
      await ctx.db.patch(user._id, {
        interestProfile: serialized,
      });
    }
    return next.messageCount;
  },
});

export const deductTokens = mutation({
  args: { ...sessionArgs, amount: v.number() },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) {
      throw new Error("User not found");
    }
    const tokens = Math.max(0, (user.tokens ?? 0) - args.amount);
    await ctx.db.patch(user._id, { tokens });
    return tokens;
  },
});

export const getUserByEmailInternal = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});
