/**
 * Multimedia learning library content model for GigaLearn Discover.
 * Extends the existing TS-catalog pattern (rhymes / concrete objects) —
 * not a second CMS. Large binary media is optional; emoji + TTS packs
 * remain fully playable offline once downloaded as JSON snapshots.
 */

import type { GigaLearnLevelId } from "@/lib/gigalearn/levels";

export type MediaContentType =
  | "video_story"
  | "picture_card"
  | "audio_lesson"
  | "rhyme_song"
  | "game"
  | "culture"
  | "country_profile";

export type MediaDiscoverCategory =
  | "videos-stories"
  | "pictures-objects"
  | "rhymes-songs"
  | "play-practise"
  | "africa-culture"
  | "offline";

export type MediaLanguageCode = "en" | "tw" | "ee" | "gaa" | "dag" | "ha";

export type MediaSourceRights = {
  /** Human-readable provenance. */
  source: string;
  /** e.g. original | public-domain | licensed | curriculum-aligned summary */
  rights: string;
  /** True when a human educator reviewed the pack. */
  reviewed: boolean;
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
  /** Canonical Ghana curriculum level id when applicable (e.g. kg-2). */
  curriculumLevelId?: string;
  curriculumNote?: string;
  countryCode?: string;
  culturalTheme?: string;
  illustration: Extract<MediaAssetRef, { kind: "emoji" }>;
  /** Spoken labels — English first, then Ghanaian languages when provided. */
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
    id: "videos-stories",
    label: "Videos & Stories",
    emoji: "🎬",
    description: "Short stories and animated lessons",
  },
  {
    id: "pictures-objects",
    label: "Pictures & Objects",
    emoji: "🖼️",
    description: "See real things and hear their names",
  },
  {
    id: "rhymes-songs",
    label: "Rhymes, Songs & Poems",
    emoji: "🎵",
    description: "Nursery rhymes and call-and-response",
  },
  {
    id: "play-practise",
    label: "Play & Practise",
    emoji: "🎮",
    description: "Counting, matching and identification games",
  },
  {
    id: "africa-culture",
    label: "Africa & Culture",
    emoji: "🌍",
    description: "Ghana first — crafts, countries and culture",
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
