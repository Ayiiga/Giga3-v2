/**
 * Phase 6 Africa-launch client flags.
 * Defaults OFF — production UX unchanged until remote/admin enablement.
 */

export type Phase6Flags = {
  multiRegion: boolean;
  creatorEcosystem: boolean;
  education: boolean;
  orgAccounts: boolean;
  aiPlatform: boolean;
  commerce: boolean;
  operations: boolean;
  partnerships: boolean;
  compliance: boolean;
  adminTools: boolean;
};

export const PHASE6_FLAG_DEFAULTS: Phase6Flags = {
  multiRegion: false,
  creatorEcosystem: false,
  education: false,
  orgAccounts: false,
  aiPlatform: false,
  commerce: false,
  operations: false,
  partnerships: false,
  compliance: false,
  adminTools: false,
};

export const PHASE6_FLAG_REMOTE_KEYS = {
  multiRegion: "phase6.multi_region",
  creatorEcosystem: "phase6.creator_ecosystem",
  education: "phase6.education",
  orgAccounts: "phase6.org_accounts",
  aiPlatform: "phase6.ai_platform",
  commerce: "phase6.commerce",
  operations: "phase6.operations",
  partnerships: "phase6.partnerships",
  compliance: "phase6.compliance",
  adminTools: "phase6.admin_tools",
} as const;

const STORAGE_KEY = "giga3_phase6_flags_v1";

function readStored(): Partial<Phase6Flags> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<Phase6Flags>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getPhase6Flags(): Phase6Flags {
  return { ...PHASE6_FLAG_DEFAULTS, ...readStored() };
}

export function isPhase6FlagEnabled(key: keyof Phase6Flags): boolean {
  return Boolean(getPhase6Flags()[key]);
}

export function mergeRemotePhase6Flags(
  remote: Record<string, { enabled: boolean; value: string }> | undefined
): Phase6Flags {
  const stored = readStored();
  const base = { ...PHASE6_FLAG_DEFAULTS, ...stored };
  if (!remote) return base;

  function remoteEnabled(key: string, fallback: boolean): boolean {
    const entry = remote[key];
    if (!entry) return fallback;
    return Boolean(entry.enabled);
  }

  return {
    multiRegion:
      stored.multiRegion ?? remoteEnabled("phase6.multi_region", base.multiRegion),
    creatorEcosystem:
      stored.creatorEcosystem ??
      remoteEnabled("phase6.creator_ecosystem", base.creatorEcosystem),
    education: stored.education ?? remoteEnabled("phase6.education", base.education),
    orgAccounts:
      stored.orgAccounts ?? remoteEnabled("phase6.org_accounts", base.orgAccounts),
    aiPlatform:
      stored.aiPlatform ?? remoteEnabled("phase6.ai_platform", base.aiPlatform),
    commerce: stored.commerce ?? remoteEnabled("phase6.commerce", base.commerce),
    operations:
      stored.operations ?? remoteEnabled("phase6.operations", base.operations),
    partnerships:
      stored.partnerships ??
      remoteEnabled("phase6.partnerships", base.partnerships),
    compliance:
      stored.compliance ?? remoteEnabled("phase6.compliance", base.compliance),
    adminTools:
      stored.adminTools ?? remoteEnabled("phase6.admin_tools", base.adminTools),
  };
}
