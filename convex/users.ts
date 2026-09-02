import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  parseInterestProfile,
  serializeInterestProfile,
  updateInterestProfile,
} from "./userLearning";
import { isValidMode } from "./aiModes";
import { grantStarterCreditsIfNeeded } from "./userStarterCredits";
import { requireSession, tryRequireSession } from "./auth";
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

/**
 * Upsert the user record for an email whose ownership has ALREADY been proven
 * (password check, emailed reset token, or verified Supabase JWT). Never mints
 * a session — callers do that after verification.
 */
async function ensureUserRecord(ctx: MutationCtx, rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();
  const existing = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
  if (existing) {
    if (existing.accountStatus === "suspended") {
      throw new Error("This account has been suspended. Contact support.");
    }
    return await grantStarterCreditsIfNeeded(ctx, email, existing);
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
  return await grantStarterCreditsIfNeeded(ctx, email, user);
}

/** Server-only upsert used by verified auth flows (password, reset link, Supabase). */
export const ensureUserInternal = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ensureUserRecord(ctx, args.email);
    return { userId: user._id, email: user.email };
  },
});

/**
 * @deprecated Formerly issued a session token for any email with no proof of
 * ownership (account takeover). Kept as a public function only so stale PWA
 * bundles get a clear error instead of "function not found"; it never mints a
 * session. Sign in with a password, the emailed reset link, or Supabase.
 */
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
    await ctx.db.insert("securityEvents", {
      eventType: SECURITY_EVENT_TYPES.AUTH_FAILURE,
      severity: "low",
      message: "Legacy email-only session bootstrap rejected",
      emailHash: email.slice(0, 64),
      dateKey: new Date().toISOString().slice(0, 10),
      createdAt: Date.now(),
    });
    throw new UnauthorizedError(
      "Email-only sign-in is no longer available. Sign in with your password, or use “Forgot password” to set one."
    );
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

/** Ops-only backfill — run via `npx convex run`; not callable from clients. */
export const backfillMissingStarterCredits = internalMutation({
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

/** Lightweight probe so the chat shell can recover from expired tokens without crashing. */
export const validateSession = query({
  args: sessionArgs,
  handler: async (_ctx, args) => {
    const email = await tryRequireSession(args.sessionToken);
    if (!email) return { ok: false as const };
    return { ok: true as const, email };
  },
});

export const getChatCredits = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await tryRequireSession(args.sessionToken);
    if (!email) return null;
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
    const email = await tryRequireSession(args.sessionToken);
    if (!email) return null;
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
