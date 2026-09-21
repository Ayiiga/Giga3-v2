/**
 * Concrete-objects catalog for lower grades (Creche–P3).
 * Real things first: fruits, vegetables, animals, shapes-as-objects,
 * colors-as-fruits, body parts — plus quizzes, games, rhymes, poems,
 * songs, Q&A and African voiceovers. All offline-first, Tailwind only.
 */

import type { GigaLearnLevelId } from "@/lib/gigalearn/levels";
import { speakWithGigaLearnVoice } from "@/lib/gigalearn/speechSynthesis";

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
    items: [
      { id: "apple", emoji: "🍎", title: "Apple", subtitle: "Count 1–5 fruits" },
      { id: "banana", emoji: "🍌", title: "Banana", subtitle: "Count 1–5 fruits" },
      { id: "orange", emoji: "🍊", title: "Orange", subtitle: "Count 1–5 fruits" },
      { id: "mango", emoji: "🥭", title: "Mango", subtitle: "Count 1–5 fruits" },
      { id: "pawpaw", emoji: "🍈", title: "Pawpaw", subtitle: "Count 1–5 fruits" },
    ],
  },
  {
    id: "vegetables",
    title: "Vegetables",
    badge: "Concrete",
    items: [
      { id: "carrot", emoji: "🥕", title: "Carrot", subtitle: "See & touch veggies" },
      { id: "potato", emoji: "🥔", title: "Potato", subtitle: "See & touch veggies" },
      { id: "tomato", emoji: "🍅", title: "Tomato", subtitle: "See & touch veggies" },
    ],
  },
  {
    id: "animals",
    title: "Animals",
    badge: "Concrete",
    items: [
      { id: "dog", emoji: "🐶", title: "Dog", subtitle: "Animals around us" },
      { id: "cat", emoji: "🐱", title: "Cat", subtitle: "Animals around us" },
      { id: "chicken", emoji: "🐔", title: "Chicken", subtitle: "Animals around us" },
      { id: "goat", emoji: "🐐", title: "Goat", subtitle: "Animals around us" },
    ],
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
    items: [
      { id: "hands", emoji: "🙌", title: "Hands", subtitle: "Touch & see body" },
      { id: "eyes", emoji: "👀", title: "Eyes", subtitle: "Touch & see body" },
      { id: "nose", emoji: "👃", title: "Nose", subtitle: "Touch & see body" },
    ],
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
    textTwi: "Kan maŋgo no: 1, 2, 3",
    voiceId: "abena-twi",
    teleprompterNote: "TELEPROMPTER TOP 25% — teacher script on top, kids see fruits on bottom 75%",
    quizLabel: "Quiz · Count fruits (5 Qs)",
    quizCount: 5,
  },
  {
    level: "KG2",
    title: "KG2 Maths · Counting Bananas",
    concreteRow: ["🍌", "🍌", "🍌", "🍌"],
    concreteAnswer: "= 4 bananas",
    textEn: "Count the bananas: 1, 2, 3, 4",
    textTwi: "Kan kwaadu no: 1, 2, 3, 4",
    voiceId: "abena-twi",
    teleprompterNote: "TELEPROMPTER TOP 25% — teacher script on top, kids see fruits on bottom 75%",
    quizLabel: "Quiz · Count fruits (5 Qs)",
    quizCount: 5,
  },
  {
    level: "P1",
    title: "P1 Maths · Oranges Together",
    concreteRow: ["🍊", "🍊"],
    concreteAnswer: "= 2 oranges",
    textEn: "Count the oranges: 1, 2",
    textTwi: "Kan ankaa no: 1, 2",
    voiceId: "abena-twi",
    teleprompterNote: "TELEPROMPTER TOP 25% — teacher script on top, kids see fruits on bottom 75%",
    quizLabel: "Quiz · Count fruits (5 Qs)",
    quizCount: 5,
  },
  {
    level: "P2",
    title: "P2 Maths · Adding Oranges",
    concreteRow: ["🍊", "+", "🍊"],
    concreteAnswer: "= 2 oranges",
    textEn: "1 orange + 1 orange = 2 oranges",
    textTwi: "Ankaa 1 + ankaa 1 = ankaa 2",
    voiceId: "musa-hausa",
    teleprompterNote: "TELEPROMPTER TOP 25% — teacher script on top, kids see fruits on bottom 75%",
    quizLabel: "Quiz · Add fruits (5 Qs)",
    quizCount: 5,
  },
  {
    level: "P3",
    title: "P3 Maths · Taking Mangoes",
    concreteRow: ["🥭", "🥭", "🥭", "🥭", "🥭", "−", "🥭", "🥭"],
    concreteAnswer: "= 3 mangoes",
    textEn: "5 mangoes − 2 mangoes = 3 mangoes",
    textTwi: "Maŋgo 5 − maŋgo 2 = maŋgo 3",
    voiceId: "naa-ga",
    teleprompterNote: "TELEPROMPTER TOP 25% — teacher script on top, kids see fruits on bottom 75%",
    quizLabel: "Quiz · Take fruits (5 Qs)",
    quizCount: 5,
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
  { id: "abena-twi", name: "Abena", language: "Twi · Female · slow & clear for KG", flag: "🇬🇭", style: "KG default" },
  { id: "musa-hausa", name: "Musa", language: "Hausa · Male", flag: "🇳🇬", style: "Primary" },
  { id: "naa-ga", name: "Naa", language: "Ga · Female", flag: "🇬🇭", style: "Primary" },
  { id: "kofi-ewe", name: "Kofi", language: "Ewe · Male", flag: "🇬🇭", style: "Primary" },
  { id: "ade-yoruba", name: "Ade", language: "Yoruba · Female", flag: "🇳🇬", style: "Primary" },
  { id: "zawadi-swahili", name: "Zawadi", language: "Swahili · Female", flag: "🇰🇪", style: "Primary" },
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

export const OFFLINE_BANNER = {
  text: "Offline · Concrete objects cached · African voices ready",
  storageUsed: "1.2GB",
  storageTotal: "10GB",
};
