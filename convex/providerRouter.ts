/**
 * Hybrid multi-provider routing — tier detection, request classification, failover plans.
 * Extend by adding providers to PROVIDER_REGISTRY without changing call sites.
 */

import type { AiModeId } from "./aiModes";
import { isSubscriptionActive } from "./creditsConfig";
import type { SubscriptionPlanId } from "./subscriptionPlans";

/** User-facing AI access tier — drives default LLM provider. */
export type AiProviderTier = "free" | "premium";

/** Registered chat provider ids — keep in sync with chatEngine failover lanes. */
export const CHAT_PROVIDER_IDS = [
  "gemini",
  "openai_primary",
  "openai_fallback_model",
  "openai_secondary_key",
  "fal_ai",
  "openai_image",
  "local_fallback",
] as const;

export type ChatProviderId = (typeof CHAT_PROVIDER_IDS)[number];

export type RequestKind = "text_chat" | "image_generation";

export type UserRoutingProfile = {
  subscriptionPlan: SubscriptionPlanId | string;
  subscriptionExpiresAt?: number | null;
  /** True when user has purchased credit packs (not starter grant only). */
  hasPurchasedCredits?: boolean;
};

export type RoutingInput = {
  tier: AiProviderTier;
  mode: AiModeId | string;
  query: string;
  hasAttachments?: boolean;
  hasImageAttachment?: boolean;
};

export type ChatRoutePlan = {
  tier: AiProviderTier;
  requestKind: RequestKind;
  primaryProvider: ChatProviderId;
  failoverOrder: ChatProviderId[];
  enableWebSearch: boolean;
  /** Premium tier may use higher token budget when configured. */
  maxTokensMultiplier: number;
};

const IMAGE_GENERATION_RE =
  /\b(generate|create|make|design|draw|render|produce)\s+(an?\s+)?(image|picture|photo|illustration|logo|poster|flyer|brochure|infographic|diagram|graphic|banner|thumbnail|mockup|avatar|icon)\b/i;

const IMAGE_ASSET_RE =
  /\b(logo|poster|flyer|brochure|infographic|diagram|presentation slide|marketing (asset|material)|social media (post|graphic|content)|advertisement|ad creative)\b/i;

const IMAGE_REQUEST_RE =
  /\b(image of|picture of|visual of|graphic (for|of)|illustration (of|for)|design (a|an|me))\b/i;

const CURRENT_INFO_RE =
  /\b(today|tonight|yesterday|this week|this month|this year|latest|current|recent|news|now|202[4-9]|stock price|weather|score|election|who is (the )?president)\b/i;

const RESEARCH_MODES = new Set<string>(["research", "news", "university", "waec"]);

const GEMINI_MODES = new Set<string>([
  "general",
  "coding",
  "homework",
  "waec",
  "university",
  "research",
  "resume",
  "book",
  "social",
  "news",
]);

export function resolveAiProviderTier(profile: UserRoutingProfile): AiProviderTier {
  if (
    isSubscriptionActive(
      profile.subscriptionPlan as SubscriptionPlanId,
      profile.subscriptionExpiresAt
    )
  ) {
    return "premium";
  }
  if (profile.hasPurchasedCredits) {
    return "premium";
  }
  return "free";
}

export function classifyRequestKind(
  query: string,
  mode: string,
  hasImageAttachment?: boolean
): RequestKind {
  if (hasImageAttachment) return "text_chat";
  const compact = query.trim();
  if (!compact) return "text_chat";
  if (mode === "social" && IMAGE_ASSET_RE.test(compact)) return "image_generation";
  if (IMAGE_GENERATION_RE.test(compact)) return "image_generation";
  if (IMAGE_REQUEST_RE.test(compact) && IMAGE_ASSET_RE.test(compact)) {
    return "image_generation";
  }
  return "text_chat";
}

export function shouldEnableWebSearch(
  query: string,
  mode: string,
  hasImageAttachment?: boolean
): boolean {
  if (hasImageAttachment) return false;
  if (RESEARCH_MODES.has(mode)) return true;
  if (mode === "news") return true;
  return CURRENT_INFO_RE.test(query);
}

function freeTierFailover(): ChatProviderId[] {
  return [
    "gemini",
    "openai_primary",
    "openai_fallback_model",
    "openai_secondary_key",
    "fal_ai",
  ];
}

function premiumTierFailover(): ChatProviderId[] {
  return [
    "openai_primary",
    "gemini",
    "openai_fallback_model",
    "openai_secondary_key",
    "fal_ai",
  ];
}

export function buildChatRoutePlan(input: RoutingInput): ChatRoutePlan {
  const requestKind = classifyRequestKind(input.query, input.mode, input.hasAttachments);

  if (requestKind === "image_generation") {
    return {
      tier: input.tier,
      requestKind,
      primaryProvider: "openai_image",
      failoverOrder: ["openai_image"],
      enableWebSearch: false,
      maxTokensMultiplier: 1,
    };
  }

  const failoverOrder =
    input.tier === "premium" ? premiumTierFailover() : freeTierFailover();

  return {
    tier: input.tier,
    requestKind,
    primaryProvider: failoverOrder[0],
    failoverOrder,
    enableWebSearch: shouldEnableWebSearch(
      input.query,
      input.mode,
      input.hasImageAttachment
    ),
    maxTokensMultiplier: input.tier === "premium" ? 1.25 : 1,
  };
}

export function isGeminiFriendlyMode(mode: string): boolean {
  return GEMINI_MODES.has(mode);
}

export function getTierProviderLabel(tier: AiProviderTier): string {
  return tier === "premium" ? "OpenAI (Premium)" : "Google Gemini (Free)";
}

export function buildPromptCacheKey(parts: {
  mode: string;
  tier: string;
  systemPrompt: string;
  query: string;
}): string {
  const payload = `${parts.tier}|${parts.mode}|${parts.systemPrompt}|${parts.query}`;
  let hash = 5381;
  for (let i = 0; i < payload.length; i += 1) {
    hash = ((hash << 5) + hash) ^ payload.charCodeAt(i);
  }
  return `pc_${(hash >>> 0).toString(36)}_${payload.length}`;
}

export function shouldUseResponseCache(args: {
  hasAttachments: boolean;
  queryLength: number;
}): boolean {
  if (process.env.AI_RESPONSE_CACHE_ENABLED === "false") return false;
  if (args.hasAttachments) return false;
  return args.queryLength <= 600;
}
