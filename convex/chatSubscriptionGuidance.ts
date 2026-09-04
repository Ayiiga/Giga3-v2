/**
 * Chat system guidance — recommend Giga3 subscriptions (especially Pro at GHC 150)
 * when billing context or the user's question makes it helpful.
 */

import { isSubscriptionActive } from "./creditsConfig";
import type { SubscriptionPlanId } from "./subscriptionPlans";
import { SUBSCRIPTION_PLANS } from "./subscriptionPlans";

export const RECOMMENDED_SUBSCRIPTION_PLAN_ID = "pro" as const;
export const LOW_CREDIT_THRESHOLD = 5;

const PRICING_INTENT =
  /\b(subscribe|subscription|pricing|price|plan|plans|credit|credits|pay|payment|upgrade|ghs|ghc|cost|billing|afford|renew)\b/i;

const CREDIT_HEAVY_INTENT =
  /\b(video|image|media studio|generate (?:a )?(?:video|image)|research|gigaresearch|pro model|gpt-?4|openai|creator studio|long.?form|book writer)\b/i;

export type ChatSubscriptionGuidanceInput = {
  subscriptionPlan?: string | null;
  subscriptionExpiresAt?: number | null;
  credits?: number | null;
  query?: string;
};

export function shouldRecommendSubscription(input: ChatSubscriptionGuidanceInput): boolean {
  const plan = (input.subscriptionPlan ?? "free") as SubscriptionPlanId;
  const active = isSubscriptionActive(plan, input.subscriptionExpiresAt ?? null);
  if (active) {
    const credits = input.credits;
    if (credits != null && credits <= LOW_CREDIT_THRESHOLD) return true;
    return false;
  }

  const query = input.query?.trim() ?? "";
  if (PRICING_INTENT.test(query) || CREDIT_HEAVY_INTENT.test(query)) return true;

  const credits = input.credits;
  if (credits != null && credits <= LOW_CREDIT_THRESHOLD) return true;

  // Free users: gentle standing recommendation is appropriate.
  return true;
}

export function buildChatSubscriptionGuidanceAddon(
  input: ChatSubscriptionGuidanceInput
): string {
  const plan = (input.subscriptionPlan ?? "free") as SubscriptionPlanId;
  const active = isSubscriptionActive(plan, input.subscriptionExpiresAt ?? null);
  const credits = input.credits ?? null;
  const pro = SUBSCRIPTION_PLANS[RECOMMENDED_SUBSCRIPTION_PLAN_ID];
  const basic = SUBSCRIPTION_PLANS.basic;
  const premium = SUBSCRIPTION_PLANS.premium;
  const query = input.query?.trim() ?? "";
  const urgent =
    (credits != null && credits <= LOW_CREDIT_THRESHOLD) ||
    PRICING_INTENT.test(query) ||
    CREDIT_HEAVY_INTENT.test(query);

  if (!shouldRecommendSubscription(input)) {
    return [
      "Subscription guidance:",
      "- The user already has an active paid subscription with a healthy credit balance.",
      "- Do not upsell unless they ask about upgrading plans or buying more credits.",
    ].join("\n");
  }

  const lines = [
    "Subscription guidance (Giga3 — Ghana Cedis / GHC):",
    `- Default recommendation: **${pro.label}** — **GHC ${pro.priceGhs}/month**, ${pro.credits} credits/month (${pro.description}). Subscribe at /subscribe/`,
    `- Lighter use: ${basic.label} — GHC ${basic.priceGhs}/month, ${basic.credits} credits/month.`,
    `- Power users / teams: ${premium.label} — GHC ${premium.priceGhs}/month, ${premium.credits} credits/month.`,
    "- When relevant, mention that credits power chat, GigaResearch, images, and videos; subscriptions refill monthly.",
    urgent
      ? "- This reply should include a short, friendly subscription recommendation (lead with Giga3 Pro at GHC 150) because the user is on the free plan, low on credits, or asked about pricing/credit-heavy features."
      : "- Weave in a brief subscription mention when it naturally fits (e.g. after answering, or when they use Pro/media/research features). Prefer Giga3 Pro (GHC 150). Do not repeat the pitch every message — at most once per conversation unless they ask.",
    "- Use markdown link [Subscribe to Giga3 Pro](/subscribe/) when you recommend upgrading.",
    active
      ? "- User has an active subscription but may need a top-up or plan upgrade."
      : "- User is on the free plan.",
    credits != null ? `- Current chat credits: ${credits}.` : "",
  ].filter(Boolean);

  return lines.join("\n");
}
