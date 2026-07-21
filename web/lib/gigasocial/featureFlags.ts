/** GigaSocial professional upgrade feature flags — env + localStorage overrides. */

export type GigaSocialFeatureFlags = {
  enableGigaCreate: boolean;
  enableAIEditing: boolean;
  enableGigaRemix: boolean;
  enableCreatorStudio: boolean;
  enableMediaStudio: boolean;
  enableFeedCategories: boolean;
  enableGigaLive: boolean;
  enableGigaFans: boolean;
  /** AI suggestion toolbar under every post (never mutates original). */
  enablePostAIActions: boolean;
  /** Data Saver / Ultra Data Saver + adaptive media loading. */
  enableDataSaver: boolean;
  /** Offline likes/comments/follows/posts queue (separate from chat outbox). */
  enableSocialOutbox: boolean;
  /** Personalized For You ranking + expanded feed sections. */
  enableIntelligentFeed: boolean;
  /** Tip / gift button on post cards. */
  enablePostTips: boolean;
  /** AI Studio hub + expanded create tools (teleprompter, scripts, etc.). */
  enableAIStudio: boolean;
  /** Creator Wallet tab + growth assistant on creator dashboard. */
  enableCreatorWallet: boolean;
  /** Creator level ladder (New → Legend) display. */
  enableCreatorLevels: boolean;
};

const STORAGE_KEY = "giga3_gigasocial_flags";

function envFlag(name: string, defaultValue = true): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return defaultValue;
  return raw !== "false" && raw !== "0";
}

export const GIGASOCIAL_FEATURE_DEFAULTS: GigaSocialFeatureFlags = {
  enableGigaCreate: envFlag("NEXT_PUBLIC_GIGASOCIAL_GIGA_CREATE", true),
  enableAIEditing: envFlag("NEXT_PUBLIC_GIGASOCIAL_AI_EDITING", true),
  enableGigaRemix: envFlag("NEXT_PUBLIC_GIGASOCIAL_REMIX", true),
  enableCreatorStudio: envFlag("NEXT_PUBLIC_GIGASOCIAL_CREATOR_STUDIO", true),
  enableMediaStudio: envFlag("NEXT_PUBLIC_GIGASOCIAL_MEDIA_STUDIO", true),
  enableFeedCategories: envFlag("NEXT_PUBLIC_GIGASOCIAL_FEED_CATEGORIES", true),
  enableGigaLive: envFlag("NEXT_PUBLIC_GIGASOCIAL_LIVE", true),
  enableGigaFans: envFlag("NEXT_PUBLIC_GIGASOCIAL_FANS", true),
  enablePostAIActions: envFlag("NEXT_PUBLIC_GIGASOCIAL_POST_AI_ACTIONS", true),
  enableDataSaver: envFlag("NEXT_PUBLIC_GIGASOCIAL_DATA_SAVER", true),
  enableSocialOutbox: envFlag("NEXT_PUBLIC_GIGASOCIAL_SOCIAL_OUTBOX", true),
  enableIntelligentFeed: envFlag("NEXT_PUBLIC_GIGASOCIAL_INTELLIGENT_FEED", true),
  enablePostTips: envFlag("NEXT_PUBLIC_GIGASOCIAL_POST_TIPS", true),
  enableAIStudio: envFlag("NEXT_PUBLIC_GIGASOCIAL_AI_STUDIO", true),
  enableCreatorWallet: envFlag("NEXT_PUBLIC_GIGASOCIAL_CREATOR_WALLET", true),
  enableCreatorLevels: envFlag("NEXT_PUBLIC_GIGASOCIAL_CREATOR_LEVELS", true),
};

export function readGigaSocialFeatureOverrides(): Partial<GigaSocialFeatureFlags> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<GigaSocialFeatureFlags>;
  } catch {
    return {};
  }
}

export function getGigaSocialFeatures(
  overrides?: Partial<GigaSocialFeatureFlags>
): GigaSocialFeatureFlags {
  const stored = overrides ?? readGigaSocialFeatureOverrides();
  return { ...GIGASOCIAL_FEATURE_DEFAULTS, ...stored };
}

export function useGigaSocialFeatures(): GigaSocialFeatureFlags {
  if (typeof window === "undefined") return GIGASOCIAL_FEATURE_DEFAULTS;
  return getGigaSocialFeatures();
}
