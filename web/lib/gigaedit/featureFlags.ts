/** GigaEdit feature flags — frontend-only, env + localStorage overrides. */

export type GigaEditFeatureFlags = {
  enableGigaEdit: boolean;
  enableGigaEditOffline: boolean;
  enableGigaEditAiAssist: boolean;
  /** Publish screen + GigaSocial handoff / sound library. */
  enableGigaEditPublish: boolean;
};

const STORAGE_KEY = "giga3_gigaedit_flags";

function envFlag(name: string, defaultValue = true): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return defaultValue;
  return raw !== "false" && raw !== "0";
}

export const GIGAEDIT_FEATURE_DEFAULTS: GigaEditFeatureFlags = {
  enableGigaEdit: envFlag("NEXT_PUBLIC_GIGAEDIT_ENABLED", true),
  enableGigaEditOffline: envFlag("NEXT_PUBLIC_GIGAEDIT_OFFLINE", true),
  enableGigaEditAiAssist: envFlag("NEXT_PUBLIC_GIGAEDIT_AI_ASSIST", true),
  enableGigaEditPublish: envFlag("NEXT_PUBLIC_GIGAEDIT_PUBLISH", true),
};

export function readGigaEditFeatureOverrides(): Partial<GigaEditFeatureFlags> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<GigaEditFeatureFlags>;
  } catch {
    return {};
  }
}

export function getGigaEditFeatures(
  overrides?: Partial<GigaEditFeatureFlags>
): GigaEditFeatureFlags {
  return { ...GIGAEDIT_FEATURE_DEFAULTS, ...(overrides ?? readGigaEditFeatureOverrides()) };
}

export function useGigaEditFeatures(): GigaEditFeatureFlags {
  if (typeof window === "undefined") return GIGAEDIT_FEATURE_DEFAULTS;
  return getGigaEditFeatures();
}
