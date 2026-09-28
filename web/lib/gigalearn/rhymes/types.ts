export type RhymeCategoryId =
  | "alphabet"
  | "numbers"
  | "fruits-vegetables"
  | "african-animals"
  | "colours"
  | "health-hygiene"
  | "good-manners"
  | "school"
  | "nature-environment"
  | "movement-actions"
  | "african-languages"
  | "ghana-african-culture";

/** original = written by Giga3; the others are reserved for user/curriculum/imported material. */
export type RhymeSourceType = "original" | "userProvided" | "curriculumReference" | "importedReference";

export interface RhymeCategory {
  id: RhymeCategoryId;
  label: string;
  emoji: string;
  description: string;
}

export interface RhymeQuestion {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
}

export interface RhymeGlossaryEntry {
  word: string;
  meaning: string;
}

export interface GigaRhyme {
  id: string;
  title: string;
  category: RhymeCategoryId;
  ageRange: string;
  learningObjective: string;
  description: string;
  lyrics: string[];
  /** e.g. "English", "English + Twi". */
  language: string;
  region: string;
  culturalContext: string;
  difficulty: "easy" | "medium" | "challenging";
  keywords: string[];
  /** Emoji illustration — no image download, renders instantly offline. */
  illustration: { emoji: string; alt: string };
  /** Spoken through the existing GigaLearn Hear pathway; no recorded audio files. */
  audio: { kind: "tts"; voiceId: string };
  activities: string[];
  questions: RhymeQuestion[];
  glossary?: RhymeGlossaryEntry[];
  sourceType: RhymeSourceType;
  originalContent: boolean;
  /** Educator / native-speaker review has not happened yet for the launch set. */
  reviewed: boolean;
}

export const ORIGINAL_RHYME_LABEL = "Original Giga3 educational content";
