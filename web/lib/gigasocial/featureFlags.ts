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
  /** Expanded community types, rooms stubs, and collaboration spaces. */
  enableCommunitiesV2: boolean;
  /** AI Community Assistant (suggestions only — never auto-removes content). */
  enableCommunityAI: boolean;
  /** Interest / region / follow based community discovery. */
  enableCommunityDiscovery: boolean;
  /** Skeletons, micro-motion, smart empty states (no pull-to-refresh). */
  enableDelightfulUX: boolean;
  /** Optional haptic feedback on supported devices. */
  enableHaptics: boolean;
  /** Plugin registry for future installable tools (default on = registry visible). */
  enableSocialPlugins: boolean;
  /** Multi-provider social AI abstraction (separate from chat aiRouter). */
  enableSocialAiRouter: boolean;
  /** Client readiness helpers for future API v2 (v1 remains default). */
  enableApiV2Client: boolean;
  /** Daily login / weekly challenge reward surfaces. */
  enableDailyRewards: boolean;
  /** Creator challenges + leaderboard (display + local scoring). */
  enableCreatorChallenges: boolean;
  /** Social invite UI layered on platformGrowth referrals. */
  enableSocialReferrals: boolean;
  /** Grouped notification center + granular local prefs. */
  enableSmartNotifications: boolean;
  /** Explorer → Legend loyalty ladder (display over XP). */
  enableLoyaltyLevels: boolean;
  /** Personal AI assistant card (summaries / reminders). */
  enablePersonalAssistant: boolean;
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
  enableCommunitiesV2: envFlag("NEXT_PUBLIC_GIGASOCIAL_COMMUNITIES_V2", true),
  enableCommunityAI: envFlag("NEXT_PUBLIC_GIGASOCIAL_COMMUNITY_AI", true),
  enableCommunityDiscovery: envFlag("NEXT_PUBLIC_GIGASOCIAL_COMMUNITY_DISCOVERY", true),
  enableDelightfulUX: envFlag("NEXT_PUBLIC_GIGASOCIAL_DELIGHTFUL_UX", true),
  enableHaptics: envFlag("NEXT_PUBLIC_GIGASOCIAL_HAPTICS", true),
  enableSocialPlugins: envFlag("NEXT_PUBLIC_GIGASOCIAL_PLUGINS", false),
  enableSocialAiRouter: envFlag("NEXT_PUBLIC_GIGASOCIAL_AI_ROUTER", true),
  enableApiV2Client: envFlag("NEXT_PUBLIC_GIGASOCIAL_API_V2", false),
  enableDailyRewards: envFlag("NEXT_PUBLIC_GIGASOCIAL_DAILY_REWARDS", true),
  enableCreatorChallenges: envFlag("NEXT_PUBLIC_GIGASOCIAL_CHALLENGES", true),
  enableSocialReferrals: envFlag("NEXT_PUBLIC_GIGASOCIAL_REFERRALS", true),
  enableSmartNotifications: envFlag("NEXT_PUBLIC_GIGASOCIAL_SMART_NOTIFICATIONS", true),
  enableLoyaltyLevels: envFlag("NEXT_PUBLIC_GIGASOCIAL_LOYALTY", true),
  enablePersonalAssistant: envFlag("NEXT_PUBLIC_GIGASOCIAL_PERSONAL_ASSISTANT", true),
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
