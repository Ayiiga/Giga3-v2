/**
 * Country-aware Discover registry.
 * Aligns with curriculumEngine country ids (ghana, nigeria, …).
 * Only available countries load catalog shards — never the full continent.
 */

import { CURRICULUM_COUNTRIES, getCurriculaForCountry } from "@/lib/gigalearn/curriculumEngine";
import type { MediaLanguageCode } from "@/lib/gigalearn/mediaLibrary/types";

/** Expansion ladder: country → regional → continental → global. */
export type MediaRegionTier = "country" | "west-africa" | "africa" | "global";

export type MediaCountryProfile = {
  /** Same id as curriculumEngine (e.g. ghana). */
  id: string;
  iso2: string;
  name: string;
  flag: string;
  /** Geographic expansion tier for this country's own packs. */
  homeRegion: Exclude<MediaRegionTier, "global">;
  /** Languages offered in Discover filters for this country. */
  languages: MediaLanguageCode[];
  /** Curriculum ids from curriculumEngine when available. */
  curriculumIds: string[];
  /** False = stub for future phases; do not load a catalog shard. */
  available: boolean;
  /** Short learner-facing note. */
  note: string;
};

const LANGUAGE_BY_COUNTRY: Record<string, MediaLanguageCode[]> = {
  ghana: ["en", "tw", "ee", "gaa", "dag", "ha"],
  nigeria: ["en", "ha"],
  kenya: ["en"],
  uganda: ["en"],
  tanzania: ["en"],
  "south-africa": ["en"],
};

const HOME_REGION: Record<string, MediaCountryProfile["homeRegion"]> = {
  ghana: "west-africa",
  nigeria: "west-africa",
  kenya: "africa",
  uganda: "africa",
  tanzania: "africa",
  "south-africa": "africa",
};

const ISO2: Record<string, string> = {
  ghana: "GH",
  nigeria: "NG",
  kenya: "KE",
  uganda: "UG",
  tanzania: "TZ",
  "south-africa": "ZA",
};

/**
 * Build media country profiles from the shared curriculum country list
 * so Studio and Discover never diverge on ids/names/flags.
 */
export const MEDIA_COUNTRY_PROFILES: MediaCountryProfile[] = CURRICULUM_COUNTRIES.map(
  (country) => ({
    id: country.id,
    iso2: ISO2[country.id] ?? country.id.slice(0, 2).toUpperCase(),
    name: country.name,
    flag: country.flag,
    homeRegion: HOME_REGION[country.id] ?? "africa",
    languages: LANGUAGE_BY_COUNTRY[country.id] ?? ["en"],
    curriculumIds: getCurriculaForCountry(country.id).map((c) => c.id),
    available: country.available,
    note:
      country.id === "ghana"
        ? "Ghana-first reference catalogue (NaCCA Early Years / CCP)."
        : `${country.name} media packs are planned — architecture ready, content not loaded yet.`,
  })
);

export function getMediaCountry(id: string | undefined | null): MediaCountryProfile | undefined {
  if (!id) return undefined;
  return MEDIA_COUNTRY_PROFILES.find((c) => c.id === id);
}

export function listAvailableMediaCountries(): MediaCountryProfile[] {
  return MEDIA_COUNTRY_PROFILES.filter((c) => c.available);
}

/** Region scopes a learner in `countryId` may see without loading other countries' shards. */
export function visibleRegionScopesForCountry(countryId: string): MediaRegionTier[] {
  const profile = getMediaCountry(countryId);
  if (!profile) return ["country"];
  if (profile.homeRegion === "west-africa") {
    return ["country", "west-africa", "africa", "global"];
  }
  if (profile.homeRegion === "africa") {
    return ["country", "africa", "global"];
  }
  return ["country", "global"];
}

export function iso2ForCountryId(countryId: string): string | undefined {
  return getMediaCountry(countryId)?.iso2;
}

export function countryIdFromIso2(iso2: string | undefined | null): string | undefined {
  if (!iso2) return undefined;
  const upper = iso2.trim().toUpperCase();
  return MEDIA_COUNTRY_PROFILES.find((c) => c.iso2 === upper)?.id;
}
