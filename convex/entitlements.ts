/**
 * Central entitlement layer — server-side feature gates.
 * USER → PLAN → ENTITLEMENTS → FEATURE → USAGE → CREDITS
 *
 * Wallet UI copy lives in web/lib/wallet/planLabels.ts; enforce access here.
 */
import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getFreeOpenAiSnapshotDb } from "./freeOpenAiQuota";
import { resolveAiProviderTier, type AiProviderTier } from "./providerRouter";
import { isSubscriptionActive } from "./creditsConfig";
import type { SubscriptionPlanId } from "./subscriptionPlans";
import { shouldOfferOpenAiImageGeneration } from "./premiumImage";

export type GigaFeatureId =
  | "chat"
  | "chat_pro_model"
  | "openai_image"
  | "live_web"
  | "media_studio"
  | "video_generation"
  | "gigaedit_export"
  | "creator_studio"
  | "marketplace_listing"
  | "team_storage"
  | "api_access"
  | "advanced_personas";

export type GigaEntitlements = {
  plan: SubscriptionPlanId | string;
  aiTier: AiProviderTier;
  subscriptionActive: boolean;
  features: Record<GigaFeatureId, boolean>;
};

type UserEntitlementRow = {
  subscriptionPlan?: string | null;
  subscriptionExpiresAt?: number | null;
  credits?: number | null;
  hasPurchasedCredits?: boolean;
};

function planId(user: UserEntitlementRow): SubscriptionPlanId | string {
  return (user.subscriptionPlan as SubscriptionPlanId) ?? "free";
}

function isCreatorPlan(plan: string): boolean {
  return plan === "pro" || plan === "premium";
}

function isBusinessPlan(plan: string): boolean {
  return plan === "premium";
}

export function computeEntitlements(user: UserEntitlementRow): GigaEntitlements {
  const plan = planId(user);
  const subscriptionActive = isSubscriptionActive(
    plan,
    user.subscriptionExpiresAt ?? null
  );
  const aiTier = resolveAiProviderTier({
    subscriptionPlan: plan,
    subscriptionExpiresAt: user.subscriptionExpiresAt,
    hasPurchasedCredits: Boolean(user.hasPurchasedCredits),
  });

  const features: Record<GigaFeatureId, boolean> = {
    chat: true,
    chat_pro_model: aiTier === "premium",
    openai_image: shouldOfferOpenAiImageGeneration(
      plan,
      user.subscriptionExpiresAt ?? null
    ),
    live_web: true,
    media_studio: subscriptionActive || isCreatorPlan(plan),
    video_generation: subscriptionActive || isCreatorPlan(plan),
    gigaedit_export: true,
    creator_studio: subscriptionActive || plan !== "free",
    marketplace_listing: isCreatorPlan(plan) && subscriptionActive,
    team_storage: isBusinessPlan(plan) && subscriptionActive,
    api_access: isBusinessPlan(plan) && subscriptionActive,
    advanced_personas: subscriptionActive || plan !== "free",
  };

  return {
    plan,
    aiTier,
    subscriptionActive,
    features,
  };
}

export function hasFeature(
  entitlements: GigaEntitlements,
  feature: GigaFeatureId
): boolean {
  return entitlements.features[feature] ?? false;
}

export function requireFeature(
  entitlements: GigaEntitlements,
  feature: GigaFeatureId,
  message?: string
): void {
  if (!hasFeature(entitlements, feature)) {
    throw new Error(
      message ??
        `This feature requires a plan upgrade (${feature.replace(/_/g, " ")}).`
    );
  }
}

/** Load entitlements for a signed-in user row from Convex. */
export async function getEntitlementsForUser(
  ctx: QueryCtx,
  userId: string
): Promise<GigaEntitlements | null> {
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", userId))
    .first();
  if (!user) return null;
  return computeEntitlements(user);
}

type EntitlementCtx = Pick<QueryCtx, "db"> | Pick<MutationCtx, "db">;

/** Server-side gate — throws when the user lacks a feature. */
export async function requireEntitlementForEmail(
  ctx: EntitlementCtx,
  email: string,
  feature: GigaFeatureId,
  message?: string
): Promise<GigaEntitlements> {
  const entitlements = await getEntitlementsForUser(ctx as QueryCtx, email);
  if (!entitlements) throw new Error("User not found");
  requireFeature(entitlements, feature, message);
  return entitlements;
}

/** Pro model: paid tier or remaining free OpenAI daily quota. */
export async function requireProModelAccess(
  ctx: EntitlementCtx,
  email: string
): Promise<void> {
  const entitlements = await getEntitlementsForUser(ctx as QueryCtx, email);
  if (!entitlements) throw new Error("User not found");
  if (hasFeature(entitlements, "chat_pro_model")) return;

  const snapshot = await getFreeOpenAiSnapshotDb(ctx, email);
  if (snapshot.remaining > 0) return;

  throw new Error(
    "Giga3 Pro requires a Pro or Premium subscription, or available free daily Pro messages. Upgrade your plan or switch to Fast / Smart / Creator."
  );
}

/** Callable from Node actions via ctx.runQuery. */
export const assertFeatureInternal = internalQuery({
  args: {
    userId: v.string(),
    feature: v.string(),
  },
  handler: async (ctx, args) => {
    await requireEntitlementForEmail(
      ctx,
      args.userId,
      args.feature as GigaFeatureId
    );
  },
});

export const assertProModelInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await requireProModelAccess(ctx, args.userId);
  },
});
