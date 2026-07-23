/**
 * Phase 5 public-beta client flags.
 * Defaults OFF — production UX unchanged until remote/admin enablement.
 * Server kill-switches: Convex remoteConfig phase5.* (see phase5Controls.ts).
 */

export type Phase5Flags = {
  beta: boolean;
  feedback: boolean;
  creatorSuccess: boolean;
  education: boolean;
  personalization: boolean;
  communityGrowth: boolean;
  monetizationBeta: boolean;
  productAnalytics: boolean;
  marketing: boolean;
  adminTools: boolean;
};

export const PHASE5_FLAG_DEFAULTS: Phase5Flags = {
  beta: false,
  feedback: false,
  creatorSuccess: false,
  education: false,
  personalization: false,
  communityGrowth: false,
  monetizationBeta: false,
  productAnalytics: false,
  marketing: false,
  adminTools: false,
};

/** Maps client flags → remoteConfig keys. */
export const PHASE5_FLAG_REMOTE_KEYS = {
  beta: "phase5.beta",
  feedback: "phase5.feedback",
  creatorSuccess: "phase5.creator_success",
  education: "phase5.education",
  personalization: "phase5.personalization",
  communityGrowth: "phase5.community_growth",
  monetizationBeta: "phase5.monetization_beta",
  productAnalytics: "phase5.product_analytics",
  marketing: "phase5.marketing",
  adminTools: "phase5.admin_tools",
} as const;

const STORAGE_KEY = "giga3_phase5_flags_v1";

function readStored(): Partial<Phase5Flags> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<Phase5Flags>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getPhase5Flags(): Phase5Flags {
  return { ...PHASE5_FLAG_DEFAULTS, ...readStored() };
}

export function isPhase5FlagEnabled(key: keyof Phase5Flags): boolean {
  return Boolean(getPhase5Flags()[key]);
}

/**
 * Merge remote phase5.* entries into client flags.
 * Missing remote keys leave defaults (OFF) intact — safe for gradual rollout.
 * localStorage overrides win for staged QA devices.
 */
export function mergeRemotePhase5Flags(
  remote: Record<string, { enabled: boolean; value: string }> | undefined
): Phase5Flags {
  const stored = readStored();
  const base = { ...PHASE5_FLAG_DEFAULTS, ...stored };
  if (!remote) return base;

  function remoteEnabled(key: string, fallback: boolean): boolean {
    const entry = remote[key];
    if (!entry) return fallback;
    return Boolean(entry.enabled);
  }

  return {
    beta: stored.beta ?? remoteEnabled("phase5.beta", base.beta),
    feedback: stored.feedback ?? remoteEnabled("phase5.feedback", base.feedback),
    creatorSuccess:
      stored.creatorSuccess ??
      remoteEnabled("phase5.creator_success", base.creatorSuccess),
    education: stored.education ?? remoteEnabled("phase5.education", base.education),
    personalization:
      stored.personalization ??
      remoteEnabled("phase5.personalization", base.personalization),
    communityGrowth:
      stored.communityGrowth ??
      remoteEnabled("phase5.community_growth", base.communityGrowth),
    monetizationBeta:
      stored.monetizationBeta ??
      remoteEnabled("phase5.monetization_beta", base.monetizationBeta),
    productAnalytics:
      stored.productAnalytics ??
      remoteEnabled("phase5.product_analytics", base.productAnalytics),
    marketing: stored.marketing ?? remoteEnabled("phase5.marketing", base.marketing),
    adminTools: stored.adminTools ?? remoteEnabled("phase5.admin_tools", base.adminTools),
  };
}
