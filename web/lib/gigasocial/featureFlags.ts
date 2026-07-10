/** GigaSocial professional upgrade feature flags — env + localStorage overrides. */

export type GigaSocialFeatureFlags = {
  enableGigaCreate: boolean;
  enableAIEditing: boolean;
  enableGigaRemix: boolean;
  enableCreatorStudio: boolean;
  enableMediaStudio: boolean;
  enableFeedCategories: boolean;
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
