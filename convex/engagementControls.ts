/**
 * Smart Engagement / lifecycle feature flags.
 * Defaults keep production unchanged (all modules OFF).
 * Admins enable via remoteConfig; each key is independently reversible.
 *
 * Keys:
 * - engagement.kill_switch     — global off switch for engagement popups + new campaigns
 * - engagement.welcome         — cross-product welcome modal
 * - engagement.checklist       — first-session checklist
 * - engagement.rating          — smart app-rating prompt (Phase 3)
 * - engagement.campaigns_admin — campaign admin UI (Phase 9)
 */

export const ENGAGEMENT_FLAG_KEYS = [
  "engagement.kill_switch",
  "engagement.welcome",
  "engagement.checklist",
  "engagement.rating",
  "engagement.campaigns_admin",
] as const;

export type EngagementFlagKey = (typeof ENGAGEMENT_FLAG_KEYS)[number];

export const ENGAGEMENT_FLAG_DEFAULTS: Record<
  EngagementFlagKey,
  { value: string; description: string; enabled: boolean }
> = {
  "engagement.kill_switch": {
    value: "disabled",
    description: "Global kill switch — when enabled, suppresses engagement popups and new campaign sends",
    enabled: false,
  },
  "engagement.welcome": {
    value: "disabled",
    description: "Cross-product welcome modal + interest picker (does not replace chat OnboardingWizard)",
    enabled: false,
  },
  "engagement.checklist": {
    value: "disabled",
    description: "Dismissible first-session checklist across Giga3 surfaces",
    enabled: false,
  },
  "engagement.rating": {
    value: "disabled",
    description: "Smart app-rating prompt after successful interactions",
    enabled: false,
  },
  "engagement.campaigns_admin": {
    value: "disabled",
    description: "Admin campaign DRAFT/TEST UI (never auto-activates campaigns)",
    enabled: false,
  },
};

/** Welcome interest options (stable ids — stored on onboardingState.interests). */
export const ENGAGEMENT_INTEREST_IDS = [
  "learning",
  "ai_tools",
  "content_creation",
  "social",
  "business",
  "video_creative",
  "marketplace",
  "teaching",
] as const;

export type EngagementInterestId = (typeof ENGAGEMENT_INTEREST_IDS)[number];

export const ENGAGEMENT_CHECKLIST_IDS = [
  "complete_profile",
  "explore_feed",
  "follow_creators",
  "try_ai_tool",
  "visit_gigalearn",
  "explore_creator",
  "notification_prefs",
] as const;

export type EngagementChecklistId = (typeof ENGAGEMENT_CHECKLIST_IDS)[number];
