/**
 * Multimedia learning library content model for GigaLearn Discover.
 * Extends the existing TS-catalog pattern (rhymes / concrete objects) —
 * not a second CMS. Large binary media is optional; emoji + TTS packs
 * remain fully playable offline once downloaded as JSON snapshots.
 *
 * Country expansion: Ghana → West Africa → Africa → Global via
 * countryId + regionScope (see countryRegistry.ts).
 */

import type { GigaLearnLevelId } from "@/lib/gigalearn/levels";
import type { MediaRegionTier } from "@/lib/gigalearn/mediaLibrary/countryRegistry";

export type MediaContentType =
  | "video_story"
  | "picture_card"
  | "audio_lesson"
  | "rhyme_song"
  | "game"
  | "culture"
  | "country_profile";

export type MediaDiscoverCategory =
  | "rhymes-poems"
  | "songs"
  | "pictures-objects"
  | "animals-nature"
  | "african-stories"
  | "videos-animation"
  | "numbers-letters"
  | "culture-occupations"
  | "games"
  /** @deprecated Phase 1 ids — still accepted by filters for older packs */
  | "videos-stories"
  | "rhymes-songs"
  | "play-practise"
  | "africa-culture"
  | "offline";

export type MediaLanguageCode = "en" | "tw" | "ee" | "gaa" | "dag" | "ha";

export type MediaAgeSuitability = {
  /** Inclusive ages in years when known. */
  minAge?: number;
  maxAge?: number;
  /** Learner-facing label, e.g. "KG2 (ages 4–5)". */
  label: string;
};

export type MediaSourceRights = {
  /** Human-readable provenance. */
  source: string;
  /** e.g. original | public-domain | licensed | curriculum-aligned summary */
  rights: string;
  /** True when a human educator reviewed the pack. */
  reviewed: boolean;
  /** Optional ISO date string when reviewed. */
  reviewedAt?: string;
  /** Optional public license or rights statement URL. */
  licenseUrl?: string;
};

export type MediaAssetRef =
  | { kind: "emoji"; emoji: string; alt: string }
  | { kind: "tts"; text: string; voiceId: string; language: MediaLanguageCode }
  | {
      kind: "remote";
      url: string;
      mimeType: string;
      /** Estimated bytes for download UI; never auto-cached wholesale. */
      estimatedBytes: number;
      /**
       * When true, offline pack cannot become `ready` without this asset locally.
       * Optional remotes may be skipped (network/quota) without blocking the pack.
       */
      required?: boolean;
      /** Optional integrity hint for future blob caching. */
      contentHash?: string;
    };

export type MediaGamePrompt = {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
  feedbackCorrect: string;
  feedbackWrong: string;
};

export type LearningMediaItem = {
  id: string;
  title: string;
  description: string;
  contentType: MediaContentType;
  discoverCategory: Exclude<MediaDiscoverCategory, "offline">;
  /** Creche / KG1 / KG2 / P1… */
  levels: GigaLearnLevelId[];
  subject: string;
  topic: string;
  languages: MediaLanguageCode[];
  /**
   * Curriculum-engine country id (ghana, nigeria, …).
   * Required for country-aware catalogs.
   */
  countryId: string;
  /** ISO-3166 alpha-2 for display (GH, NG). */
  countryCode: string;
  /**
   * How widely this pack may appear:
   * - country: only that country's learners
   * - west-africa / africa / global: shared packs (still loaded from an available shard)
   */
  regionScope: MediaRegionTier;
  /** Canonical curriculum level id when applicable (e.g. kg-2). */
  curriculumLevelId?: string;
  /** Curriculum definition id (e.g. gh-ccp). */
  curriculumId?: string;
  curriculumNote?: string;
  culturalTheme?: string;
  ageSuitability?: MediaAgeSuitability;
  illustration: Extract<MediaAssetRef, { kind: "emoji" }>;
  /** Spoken labels — English first, then local languages when provided. */
  narrations: Extract<MediaAssetRef, { kind: "tts" }>[];
  /** Optional remote media — only downloaded when the learner opts in. */
  remoteMedia?: Extract<MediaAssetRef, { kind: "remote" }>[];
  game?: MediaGamePrompt;
  /** Approximate on-device pack size when downloaded (JSON + optional blobs). */
  estimatedOfflineBytes: number;
  offlineEligible: boolean;
  rights: MediaSourceRights;
};

export type OfflineMediaPack = {
  id: string;
  itemId: string;
  title: string;
  /** Snapshot of the catalog item at download time (offline-safe). */
  item: LearningMediaItem;
  /** Optional downloaded remote blobs keyed by url. */
  blobs?: Record<string, { mimeType: string; byteLength: number; dataUrl?: string }>;
  status: "queued" | "downloading" | "ready" | "error";
  progress: number;
  bytesTotal: number;
  bytesStored: number;
  errorMessage?: string;
  savedAt: number;
  updatedAt: number;
};

export type MediaProgressEvent = {
  clientEventId: string;
  itemId: string;
  kind: "viewed" | "heard" | "game_completed";
  score?: number;
  countryId?: string;
  createdAt: number;
  syncedAt?: number;
};

export const DISCOVER_CATEGORIES: Array<{
  id: MediaDiscoverCategory;
  label: string;
  emoji: string;
  description: string;
}> = [
  {
    id: "rhymes-poems",
    label: "Rhymes & Poems",
    emoji: "📝",
    description: "Nursery rhymes and short poems",
  },
  {
    id: "songs",
    label: "Songs",
    emoji: "🎵",
    description: "Children's songs with audio",
  },
  {
    id: "pictures-objects",
    label: "Pictures & Objects",
    emoji: "🖼️",
    description: "See things and hear their names",
  },
  {
    id: "animals-nature",
    label: "Animals & Nature",
    emoji: "🌿",
    description: "Animals, rivers, trees and outdoors",
  },
  {
    id: "african-stories",
    label: "African Stories",
    emoji: "📖",
    description: "Folktales, kindness and everyday life",
  },
  {
    id: "videos-animation",
    label: "Videos & Animation",
    emoji: "🎬",
    description: "Short animated story experiences",
  },
  {
    id: "numbers-letters",
    label: "Numbers & Letters",
    emoji: "🔤",
    description: "Counting, letters and early literacy",
  },
  {
    id: "culture-occupations",
    label: "Culture & Occupations",
    emoji: "🌍",
    description: "Ghana crafts, work and culture",
  },
  {
    id: "games",
    label: "Games",
    emoji: "🎮",
    description: "Play and practise activities",
  },
  {
    id: "offline",
    label: "My Offline Learning",
    emoji: "📴",
    description: "Downloads saved on this device",
  },
];

export const LANGUAGE_LABELS: Record<MediaLanguageCode, string> = {
  en: "English",
  tw: "Twi",
  ee: "Ewe",
  gaa: "Ga",
  dag: "Dagbani",
  ha: "Hausa",
};
