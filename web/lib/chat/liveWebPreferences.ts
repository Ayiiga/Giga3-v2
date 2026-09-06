/** Client-side Live Web preferences — no secrets. */

import {
  detectFactCheckIntent,
  detectVerifyImageIntent,
  resolveResearchCapability,
  shouldAutoEnableLiveWeb,
  type ResearchCapabilityId,
} from "convex/researchCapabilities";

export type LiveWebMode = "research" | "actions";

const STORAGE_KEY = "giga3_live_web_enabled";
const MODE_STORAGE_KEY = "giga3_live_web_mode";
const CAPABILITY_STORAGE_KEY = "giga3_research_capability";

export function readLiveWebEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeLiveWebEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore quota errors */
  }
}

export function readLiveWebMode(): LiveWebMode {
  if (typeof window === "undefined") return "research";
  try {
    const value = window.localStorage.getItem(MODE_STORAGE_KEY);
    return value === "actions" ? "actions" : "research";
  } catch {
    return "research";
  }
}

export function writeLiveWebMode(mode: LiveWebMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function readResearchCapability(): ResearchCapabilityId {
  if (typeof window === "undefined") return "general";
  try {
    const value = window.localStorage.getItem(CAPABILITY_STORAGE_KEY);
    return resolveResearchCapability({
      explicit: value,
      query: "",
      liveWebEnabled: readLiveWebEnabled(),
    });
  } catch {
    return "general";
  }
}

export function writeResearchCapability(capability: ResearchCapabilityId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CAPABILITY_STORAGE_KEY, capability);
  } catch {
    /* ignore */
  }
}

export function liveWebUnavailableMessage(online: boolean): string | null {
  if (!online) {
    return "Live Web is temporarily unavailable while offline. I can provide general AI knowledge, but cannot verify the latest information right now.";
  }
  return null;
}

export function resolveSendResearchOptions(args?: {
  query?: string;
  hasImageAttachment?: boolean;
}): {
  liveWeb: boolean;
  liveWebMode?: LiveWebMode;
  researchCapability?: ResearchCapabilityId;
  autoEnabled?: boolean;
} {
  const manualEnabled = readLiveWebEnabled();
  const capability = resolveResearchCapability({
    explicit: readResearchCapability(),
    query: args?.query ?? "",
    liveWebEnabled: manualEnabled,
    hasImageAttachment: args?.hasImageAttachment,
  });
  const autoEnabled =
    !manualEnabled &&
    (shouldAutoEnableLiveWeb(args?.query ?? "") ||
      detectFactCheckIntent(args?.query ?? "") ||
      detectVerifyImageIntent(args?.query ?? "", Boolean(args?.hasImageAttachment)));
  const liveWeb =
    manualEnabled ||
    autoEnabled ||
    capability !== "general";

  if (!liveWeb) {
    return { liveWeb: false, researchCapability: "general" };
  }

  return {
    liveWeb: true,
    liveWebMode: readLiveWebMode(),
    researchCapability: capability,
    autoEnabled,
  };
}
