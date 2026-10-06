/**
 * Concrete-objects catalog for lower grades (Creche–P3).
 * Real things first: fruits, vegetables, animals, shapes-as-objects,
 * colors-as-fruits, body parts — plus quizzes, games, rhymes, poems,
 * songs, Q&A and African voiceovers. All offline-first, Tailwind only.
 */

import { countRangeForLevel, type GigaLearnLevelId } from "@/lib/gigalearn/levels";
import { speakWithGigaLearnVoice } from "@/lib/gigalearn/speechSynthesis";
import {
  LEARN_ANIMALS,
  LEARN_BODY,
  LEARN_FRUITS,
  LEARN_VEGETABLES,
} from "../../../convex/learnContent";

export type ConcreteCategoryId =
  | "fruits"
  | "vegetables"
  | "animals"
  | "shapes"
  | "colors"
  | "body";

export type ConcreteItem = {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
};

export type ConcreteCategory = {
  id: ConcreteCategoryId;
  title: string;
  badge: string;
  items: ConcreteItem[];
};

export const CONCRETE_CATEGORIES: ConcreteCategory[] = [
  {
    id: "fruits",
    title: "Fruits",
    badge: "Concrete",
    items: LEARN_FRUITS,
  },
  {
    id: "vegetables",
    title: "Vegetables",
    badge: "Concrete",
    items: LEARN_VEGETABLES,
  },
  {
    id: "animals",
    title: "Animals",
    badge: "Concrete",
    items: LEARN_ANIMALS,
  },
  {
    id: "shapes",
    title: "Shapes",
    badge: "Concrete",
    items: [
      { id: "ball-circle", emoji: "⚽", title: "Ball = Circle", subtitle: "Shapes from real objects" },
      { id: "box-square", emoji: "📦", title: "Box = Square", subtitle: "Shapes from real objects" },
    ],
  },
  {
    id: "colors",
    title: "Colors",
    badge: "Concrete",
    items: [
      { id: "red-tomato", emoji: "🍅", title: "Red = Tomato", subtitle: "Colors from real things" },
      { id: "yellow-banana", emoji: "🍌", title: "Yellow = Banana", subtitle: "Colors from real things" },
    ],
  },
  {
    id: "body",
    title: "My Body",
    badge: "Concrete",
    items: LEARN_BODY,
  },
];

export type LessonPreview = {
  level: GigaLearnLevelId;
  title: string;
  /** Concrete equation row, e.g. ["🍎","🍎","🍎"] + "= 3 apples". */
  concreteRow: string[];
  concreteAnswer: string;
  textEn: string;
  textTwi: string;
  voiceId: string;
  teleprompterNote: string;
  quizLabel: string;
  quizCount: number;
};

export const LESSON_PREVIEWS: LessonPreview[] = [
  {
    level: "KG1",
    title: "KG1 Maths · Counting Fruits",
    concreteRow: ["🍎", "🍎", "🍎"],
    concreteAnswer: "= 3 apples",
    textEn: "Count the apples: 1, 2, 3",
    textTwi: "Kan aprɛ no: 1, 2, 3",
    voiceId: "english",
    teleprompterNote: "TELEPROMPTER TOP 25% — teacher script on top, kids see fruits on bottom 75%",
    quizLabel: "Quiz · Count fruits (1–20)",
    quizCount: 20,
  },
  {
    level: "KG2",
    title: "KG2 Maths · Counting Bananas",
    concreteRow: ["🍌", "🍌", "🍌", "🍌"],
    concreteAnswer: "= 4 bananas",
    textEn: "Count the bananas: 1, 2, 3, 4",
    textTwi: "Kan kwaadu no: 1, 2, 3, 4",
    voiceId: "english",
    teleprompterNote: "TELEPROMPTER TOP 25% — teacher script on top, kids see fruits on bottom 75%",
    quizLabel: "Quiz · Count fruits (1–20)",
    quizCount: 20,
  },
  {
    level: "P1",
    title: "P1 Maths · Oranges Together",
    concreteRow: ["🍊", "🍊"],
    concreteAnswer: "= 2 oranges",
    textEn: "Count the oranges: 1, 2",
    textTwi: "Kan ankaa no: 1, 2",
    voiceId: "english",
    teleprompterNote: "TELEPROMPTER TOP 25% — teacher script on top, kids see fruits on bottom 75%",
    quizLabel: "Quiz · Count fruits (1–20)",
    quizCount: 20,
  },
  {
    level: "P2",
    title: "P2 Maths · Adding Oranges",
    concreteRow: ["🍊", "+", "🍊"],
    concreteAnswer: "= 2 oranges",
    textEn: "1 orange + 1 orange = 2 oranges",
    textTwi: "Ankaa 1 ka ankaa 1 yɛ ankaa 2",
    voiceId: "english",
    teleprompterNote: "TELEPROMPTER TOP 25% — teacher script on top, kids see fruits on bottom 75%",
    quizLabel: "Quiz · Add fruits (1–20)",
    quizCount: 20,
  },
  {
    level: "P3",
    title: "P3 Maths · Taking Mangoes",
    concreteRow: ["🥭", "🥭", "🥭", "🥭", "🥭", "−", "🥭", "🥭"],
    concreteAnswer: "= 3 mangoes",
    textEn: "5 mangoes − 2 mangoes = 3 mangoes",
    textTwi: "Mango 5 gye mango 2 yɛ mango 3",
    voiceId: "english",
    teleprompterNote: "TELEPROMPTER TOP 25% — teacher script on top, kids see fruits on bottom 75%",
    quizLabel: "Quiz · Take fruits (1–20)",
    quizCount: 20,
  },
];

export function lessonPreviewForLevel(level: string): LessonPreview {
  return (
    LESSON_PREVIEWS.find((l) => l.level === level) ??
    LESSON_PREVIEWS.find((l) => l.level === "KG1")!
  );
}

export type ConcreteQuiz = {
  id: string;
  question: string;
  concreteRow: string[];
  options: number[];
  answer: number;
};

export const CONCRETE_QUIZZES: ConcreteQuiz[] = [
  { id: "q-bananas-3", question: "How many bananas?", concreteRow: ["🍌", "🍌", "🍌"], options: [2, 3, 4], answer: 3 },
  { id: "q-apples-2", question: "How many apples?", concreteRow: ["🍎", "🍎"], options: [1, 2, 3], answer: 2 },
  { id: "q-oranges-4", question: "How many oranges?", concreteRow: ["🍊", "🍊", "🍊", "🍊"], options: [3, 4, 5], answer: 4 },
  { id: "q-mangoes-5", question: "How many mangoes?", concreteRow: ["🥭", "🥭", "🥭", "🥭", "🥭"], options: [4, 5, 3], answer: 5 },
  { id: "q-pawpaw-1", question: "How many pawpaws?", concreteRow: ["🍈"], options: [1, 2, 3], answer: 1 },
];

const COUNTING_FRUITS = [
  { emoji: "🍎", singular: "apple", plural: "apples" },
  { emoji: "🍌", singular: "banana", plural: "bananas" },
  { emoji: "🍊", singular: "orange", plural: "oranges" },
  { emoji: "🥭", singular: "mango", plural: "mangoes" },
  { emoji: "🍈", singular: "pawpaw", plural: "pawpaws" },
  { emoji: "🍍", singular: "pineapple", plural: "pineapples" },
] as const;

/** Three answer choices around the correct count, clamped to the level range. */
export function quizOptionsForAnswer(answer: number, min: number, max: number): number[] {
  const options = new Set<number>([answer]);
  let offset = 1;
  while (options.size < 3 && offset <= max - min + 2) {
    const lower = answer - offset;
    const upper = answer + offset;
    if (lower >= min && lower !== answer) options.add(lower);
    if (options.size >= 3) break;
    if (upper <= max && upper !== answer) options.add(upper);
    offset += 1;
  }
  return [...options].sort((a, b) => a - b);
}

/** Level-aware counting quizzes from 1 up to 20 (deterministic for offline use). */
export function buildCountingQuizzesForLevel(level: GigaLearnLevelId | string, poolSize = 16): ConcreteQuiz[] {
  const { min, max } = countRangeForLevel(level);
  const span = max - min + 1;
  return Array.from({ length: poolSize }, (_, index) => {
    const fruit = COUNTING_FRUITS[index % COUNTING_FRUITS.length]!;
    const answer = min + ((index * 5 + 2) % span);
    const label = answer === 1 ? fruit.singular : fruit.plural;
    return {
      id: `q-${fruit.plural}-${answer}-${index}`,
      question: `How many ${label}?`,
      concreteRow: Array.from({ length: answer }, () => fruit.emoji),
      options: quizOptionsForAnswer(answer, min, max),
      answer,
    };
  });
}

export function checkConcreteAnswer(quiz: ConcreteQuiz, picked: number): boolean {
  return picked === quiz.answer;
}

export type FruitGameRound = {
  id: string;
  prompt: string;
  fruits: string[];
  basket: string;
};

export const FRUIT_GAME: FruitGameRound = {
  id: "fruit-match",
  prompt: "Drag the fruit to the basket",
  fruits: ["🍎", "🍌", "🍊", "🥭"],
  basket: "🧺",
};

export const FRUIT_POLL = {
  id: "fruit-poll-yellow",
  question: "Which fruit is yellow?",
  options: ["Banana 🍌", "Apple 🍎"],
  answer: "Banana 🍌",
};

export type Rhyme = {
  id: string;
  title: string;
  linesEn: string[];
  linesTwi: string[];
  voiceId: string;
  voiceLabel: string;
};

export const FRUIT_RHYMES: Rhyme[] = [
  {
    id: "mango-sweet",
    title: "Mango Sweet",
    linesEn: ["Mango sweet, mango nice,", "One for you, and one slice!"],
    linesTwi: ["Mango dɛdɛ, mango yɛ dɛ,", "Baako ma wo, baako ma me!"],
    voiceId: "abena-twi",
    voiceLabel: "Abena · Twi 🇬🇭",
  },
  {
    id: "banana-song",
    title: "I Like Bananas",
    linesEn: ["I like bananas, yes I do,", "Yellow bananas, one and two!"],
    linesTwi: ["Me pɛ kwaadu, yiw!", "Kwaadu akokɔsradeɛ, baako ne mmienu!"],
    voiceId: "abena-twi",
    voiceLabel: "Abena · Twi 🇬🇭",
  },
];

export const ANANSE_POEM = {
  id: "ananse-fruits",
  title: "Ananse and the Fruits",
  lines: [
    "Ananse saw mangoes, red and sweet,",
    "He counted them all — a tasty treat!",
    "One, two, three upon the tree,",
    "Count with Ananse: you and me!",
  ],
};

export const FRUIT_QA = {
  id: "qa-orange-color",
  question: "What color is an orange?",
  answer: "Orange!",
  emoji: "🍊",
};

export type GigaLearnVoice = {
  id: string;
  name: string;
  language: string;
  flag: string;
  style: string;
};

export const GIGALEARN_VOICES: GigaLearnVoice[] = [
  { id: "english", name: "English", language: "English · Primary · clear for every level", flag: "🇬🇧", style: "Primary language" },
  { id: "abena-twi", name: "Abena", language: "Twi · Female · slow & clear for KG", flag: "🇬🇭", style: "African language" },
  { id: "musa-hausa", name: "Musa", language: "Hausa · Male", flag: "🇳🇬", style: "African language" },
  { id: "naa-ga", name: "Naa", language: "Ga · Female", flag: "🇬🇭", style: "African language" },
  { id: "kofi-ewe", name: "Kofi", language: "Ewe · Male", flag: "🇬🇭", style: "African language" },
  { id: "ade-yoruba", name: "Ade", language: "Yoruba · Female", flag: "🇳🇬", style: "African language" },
  { id: "zawadi-swahili", name: "Zawadi", language: "Swahili · Female", flag: "🇰🇪", style: "African language" },
];

export function getGigaLearnVoice(id: string): GigaLearnVoice | undefined {
  return GIGALEARN_VOICES.find((v) => v.id === id);
}

/** Offline speech preview (ON DEVICE, no credits, <2s) — best-effort on low-end phones. */
export function previewGigaLearnVoice(text: string, voiceId?: string): void {
  void speakWithGigaLearnVoice({ text, voiceId, rate: 0.9, pitch: 1.1 });
}

export const GES_STRANDS: { level: string; strands: string[] }[] = [
  { level: "KG1–KG2", strands: ["My World, Our World", "Literacy with real objects", "Numeracy with fruits & counters"] },
  { level: "Primary 1–3", strands: ["English rhymes & songs", "Maths with fruits & objects", "Science with real things"] },
];

export type EarlyYearsSubjectId = "mathematics" | "english" | "science";

export const EARLY_YEARS_SUBJECTS: Array<{ id: EarlyYearsSubjectId; label: string; emoji: string }> = [
  { id: "mathematics", label: "Mathematics", emoji: "🔢" },
  { id: "english", label: "English", emoji: "📖" },
  { id: "science", label: "Science", emoji: "🔬" },
];

export const EARLY_YEARS_TOPICS: Record<EarlyYearsSubjectId, Array<{ id: string; label: string }>> = {
  mathematics: [
    { id: "count-1-5", label: "Counting 1–5" },
    { id: "count-1-10", label: "Counting 1–10" },
    { id: "count-1-20", label: "Counting 1–20" },
    { id: "shapes", label: "Shapes (circle, square)" },
    { id: "more-less", label: "More and less" },
  ],
  english: [
    { id: "letter-b", label: "Letter B" },
    { id: "letter-a", label: "Letter A" },
    { id: "rhymes", label: "Rhymes and songs" },
    { id: "my-name", label: "My name" },
  ],
  science: [
    { id: "fruits", label: "Fruits around us" },
    { id: "animals", label: "Animals on the farm" },
    { id: "colors", label: "Colours we see" },
    { id: "weather", label: "Sun and rain" },
  ],
};

export const OFFLINE_BANNER = {
  text: "Offline · Concrete objects cached · African voices ready",
  storageUsed: "1.2GB",
  storageTotal: "10GB",
};
