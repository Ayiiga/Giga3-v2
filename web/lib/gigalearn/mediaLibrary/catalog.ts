/**
 * Country-sharded Discover catalog loader.
 * Only available countries resolve a shard; unavailable countries return [].
 * Ghana is the Phase 1 reference and remains eagerly importable for tests.
 */

import { GHANA_MEDIA_CATALOG } from "@/lib/gigalearn/mediaLibrary/catalog.ghana";
import { getMediaCountry } from "@/lib/gigalearn/mediaLibrary/countryRegistry";
import type { LearningMediaItem } from "@/lib/gigalearn/mediaLibrary/types";

/** Eager Ghana reference catalogue (backward-compatible export). */
export const MEDIA_LIBRARY_CATALOG: LearningMediaItem[] = GHANA_MEDIA_CATALOG;

const shardCache = new Map<string, LearningMediaItem[]>();

/** Synchronously resolve a known shard when already loaded / Ghana. */
export function getCatalogForCountrySync(countryId: string): LearningMediaItem[] {
  const profile = getMediaCountry(countryId);
  if (!profile?.available) return [];
  if (countryId === "ghana") return GHANA_MEDIA_CATALOG;
  return shardCache.get(countryId) ?? [];
}

/**
 * Load media for one country only. Does not pull the whole continent.
 * Future countries add a dynamic import case here.
 */
export async function loadCatalogForCountry(countryId: string): Promise<LearningMediaItem[]> {
  const profile = getMediaCountry(countryId);
  if (!profile?.available) return [];

  if (countryId === "ghana") {
    shardCache.set("ghana", GHANA_MEDIA_CATALOG);
    return GHANA_MEDIA_CATALOG;
  }

  if (shardCache.has(countryId)) {
    return shardCache.get(countryId)!;
  }

  if (countryId === "nigeria") {
    const mod = await import("@/lib/gigalearn/mediaLibrary/catalog.nigeria");
    shardCache.set("nigeria", mod.NIGERIA_MEDIA_CATALOG);
    return mod.NIGERIA_MEDIA_CATALOG;
  }

  return [];
}

export function getMediaItemById(
  id: string,
  catalog: LearningMediaItem[] = MEDIA_LIBRARY_CATALOG
): LearningMediaItem | undefined {
  return catalog.find((item) => item.id === id);
}

export function listMediaByCategory(
  category: LearningMediaItem["discoverCategory"],
  catalog: LearningMediaItem[] = MEDIA_LIBRARY_CATALOG
): LearningMediaItem[] {
  return catalog.filter((item) => item.discoverCategory === category);
}

/** Validate required country-aware metadata on a catalogue (used by tests). */
export function assertCatalogCountryMetadata(catalog: LearningMediaItem[]): string[] {
  const errors: string[] = [];
  for (const item of catalog) {
    if (!item.countryId) errors.push(`${item.id}: missing countryId`);
    if (!item.countryCode) errors.push(`${item.id}: missing countryCode`);
    if (!item.regionScope) errors.push(`${item.id}: missing regionScope`);
    if (!item.curriculumId && item.countryId === "ghana") {
      errors.push(`${item.id}: Ghana packs should set curriculumId`);
    }
    if (!item.ageSuitability?.label) {
      errors.push(`${item.id}: missing ageSuitability.label`);
    }
    if (!item.rights?.source || !item.rights?.rights) {
      errors.push(`${item.id}: incomplete rights metadata`);
    }
  }
  return errors;
}
