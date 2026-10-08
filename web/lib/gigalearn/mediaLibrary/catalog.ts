/**
 * Representative KG2 / early-years sample catalog for Discover.
 * Ghana-first. Cultural notes are high-level, well-documented practices —
 * no invented anthem lyrics, pledges, or unverified historical claims.
 */

import type { LearningMediaItem } from "@/lib/gigalearn/mediaLibrary/types";

const ORIGINAL = {
  source: "Original Giga3 educational content for early years",
  rights: "original",
  reviewed: false,
} as const;

const GHANA_FACT = {
  source: "Widely documented public geographic facts about Ghana (capital Accra)",
  rights: "public-domain-facts",
  reviewed: true,
} as const;

const CULTURE_SUMMARY = {
  source:
    "Age-appropriate summaries of widely documented Ghanaian cultural practices for classroom introduction",
  rights: "curriculum-aligned-summary",
  reviewed: false,
} as const;

export const MEDIA_LIBRARY_CATALOG: LearningMediaItem[] = [
  {
    id: "pic-mango-kg2",
    title: "Mango",
    description: "See a mango, hear its name in English and Twi, then find it in a short game.",
    contentType: "picture_card",
    discoverCategory: "pictures-objects",
    levels: ["KG1", "KG2", "P1"],
    subject: "Our World",
    topic: "Fruits",
    languages: ["en", "tw"],
    curriculumLevelId: "kg-2",
    curriculumNote: "Ghana Early Years — concrete objects and oral language",
    countryCode: "GH",
    illustration: { kind: "emoji", emoji: "🥭", alt: "Mango fruit" },
    narrations: [
      { kind: "tts", text: "Mango", voiceId: "english", language: "en" },
      { kind: "tts", text: "Mango", voiceId: "abena-twi", language: "tw" },
    ],
    game: {
      id: "find-mango",
      prompt: "Which one is the mango?",
      options: ["🍎 Apple", "🥭 Mango", "🍌 Banana"],
      answer: "🥭 Mango",
      feedbackCorrect: "Yes! That is a mango. Well done!",
      feedbackWrong: "Try again. Look for the orange mango.",
    },
    estimatedOfflineBytes: 2_400,
    offlineEligible: true,
    rights: ORIGINAL,
  },
  {
    id: "pic-drum-kg2",
    title: "Talking drum",
    description: "Meet a drum used in Ghanaian music and storytelling gatherings.",
    contentType: "picture_card",
    discoverCategory: "pictures-objects",
    levels: ["KG2", "P1", "P2"],
    subject: "Creative Arts",
    topic: "Musical instruments",
    languages: ["en"],
    curriculumLevelId: "kg-2",
    countryCode: "GH",
    culturalTheme: "drumming",
    illustration: { kind: "emoji", emoji: "🥁", alt: "Drum" },
    narrations: [
      { kind: "tts", text: "Drum", voiceId: "english", language: "en" },
      {
        kind: "tts",
        text: "This is a drum. People play drums with their hands.",
        voiceId: "english",
        language: "en",
      },
    ],
    game: {
      id: "find-drum",
      prompt: "Which picture is a drum?",
      options: ["🎸 Guitar", "🥁 Drum", "🎺 Trumpet"],
      answer: "🥁 Drum",
      feedbackCorrect: "Great listening eyes! That is a drum.",
      feedbackWrong: "Not yet. Find the round drum.",
    },
    estimatedOfflineBytes: 2_200,
    offlineEligible: true,
    rights: ORIGINAL,
  },
  {
    id: "game-count-bananas-kg2",
    title: "Count the bananas",
    description: "A short counting game with bananas for KG2 learners.",
    contentType: "game",
    discoverCategory: "play-practise",
    levels: ["KG1", "KG2"],
    subject: "Numeracy",
    topic: "Counting 1–10",
    languages: ["en", "tw"],
    curriculumLevelId: "kg-2",
    curriculumNote: "Ghana Early Years numeracy — concrete counting",
    illustration: { kind: "emoji", emoji: "🍌", alt: "Bananas" },
    narrations: [
      {
        kind: "tts",
        text: "Count the bananas: one, two, three, four.",
        voiceId: "english",
        language: "en",
      },
      {
        kind: "tts",
        text: "Kan kwaadu no: baako, mmienu, miensa, nan.",
        voiceId: "abena-twi",
        language: "tw",
      },
    ],
    game: {
      id: "count-bananas-4",
      prompt: "How many bananas? 🍌🍌🍌🍌",
      options: ["3", "4", "5"],
      answer: "4",
      feedbackCorrect: "Yes! Four bananas.",
      feedbackWrong: "Count again slowly: one, two, three, four.",
    },
    estimatedOfflineBytes: 2_000,
    offlineEligible: true,
    rights: ORIGINAL,
  },
  {
    id: "rhyme-mango-sweet",
    title: "Mango Sweet",
    description: "A short original fruit rhyme in English and Twi.",
    contentType: "rhyme_song",
    discoverCategory: "rhymes-songs",
    levels: ["Creche", "KG1", "KG2", "P1"],
    subject: "Language",
    topic: "Nursery rhymes",
    languages: ["en", "tw"],
    curriculumLevelId: "kg-2",
    countryCode: "GH",
    illustration: { kind: "emoji", emoji: "🥭", alt: "Mango rhyme" },
    narrations: [
      {
        kind: "tts",
        text: "Mango sweet, mango nice. One for you, and one slice!",
        voiceId: "english",
        language: "en",
      },
      {
        kind: "tts",
        text: "Mango dɛdɛ, mango yɛ dɛ. Baako ma wo, baako ma me!",
        voiceId: "abena-twi",
        language: "tw",
      },
    ],
    estimatedOfflineBytes: 1_800,
    offlineEligible: true,
    rights: ORIGINAL,
  },
  {
    id: "story-ananse-listen",
    title: "Ananse listens",
    description:
      "A short original story starter about Ananse the spider — a familiar figure in Ghanaian storytelling.",
    contentType: "video_story",
    discoverCategory: "videos-stories",
    levels: ["KG2", "P1", "P2"],
    subject: "Language",
    topic: "Stories",
    languages: ["en"],
    curriculumLevelId: "kg-2",
    countryCode: "GH",
    culturalTheme: "storytelling",
    illustration: { kind: "emoji", emoji: "🕷️", alt: "Ananse the spider" },
    narrations: [
      {
        kind: "tts",
        text: "Ananse sat under a big tree. He listened carefully. Good listeners learn new things.",
        voiceId: "english",
        language: "en",
      },
    ],
    game: {
      id: "ananse-listen-q",
      prompt: "What did Ananse do under the tree?",
      options: ["He listened", "He flew", "He cooked"],
      answer: "He listened",
      feedbackCorrect: "Yes! Ananse listened carefully.",
      feedbackWrong: "Listen again to the story.",
    },
    estimatedOfflineBytes: 2_600,
    offlineEligible: true,
    rights: ORIGINAL,
  },
  {
    id: "culture-kente-intro",
    title: "Kente cloth",
    description:
      "Kente is a handwoven cloth tradition associated with Ashanti and Ewe communities in Ghana. Weavers make colourful patterns on a loom.",
    contentType: "culture",
    discoverCategory: "africa-culture",
    levels: ["KG2", "P1", "P2", "P3"],
    subject: "Our World",
    topic: "Crafts",
    languages: ["en"],
    curriculumLevelId: "kg-2",
    countryCode: "GH",
    culturalTheme: "kente weaving",
    illustration: { kind: "emoji", emoji: "🧵", alt: "Cloth and thread" },
    narrations: [
      {
        kind: "tts",
        text: "Kente is a colourful cloth. Skilled weavers make it on a loom.",
        voiceId: "english",
        language: "en",
      },
    ],
    game: {
      id: "kente-q",
      prompt: "Kente cloth is made by…",
      options: ["Weavers on a loom", "Cooking in a pot", "Flying a kite"],
      answer: "Weavers on a loom",
      feedbackCorrect: "Yes — weavers make kente on a loom.",
      feedbackWrong: "Think about cloth and weaving.",
    },
    estimatedOfflineBytes: 2_500,
    offlineEligible: true,
    rights: CULTURE_SUMMARY,
  },
  {
    id: "culture-pottery-intro",
    title: "Pottery",
    description:
      "Potters shape clay with their hands and fire it to make bowls and pots used at home and in markets.",
    contentType: "culture",
    discoverCategory: "africa-culture",
    levels: ["KG2", "P1", "P2"],
    subject: "Our World",
    topic: "Crafts",
    languages: ["en"],
    countryCode: "GH",
    culturalTheme: "pottery",
    illustration: { kind: "emoji", emoji: "🏺", alt: "Clay pot" },
    narrations: [
      {
        kind: "tts",
        text: "A potter shapes soft clay into a pot. Then the pot is dried and fired.",
        voiceId: "english",
        language: "en",
      },
    ],
    estimatedOfflineBytes: 2_100,
    offlineEligible: true,
    rights: CULTURE_SUMMARY,
  },
  {
    id: "culture-farming-fishing",
    title: "Farming and fishing",
    description:
      "Many families in Ghana grow food on farms and catch fish from rivers, lakes and the sea. These are important ways people work and feed their communities.",
    contentType: "culture",
    discoverCategory: "africa-culture",
    levels: ["KG2", "P1", "P2", "P3"],
    subject: "Our World",
    topic: "Occupations",
    languages: ["en"],
    countryCode: "GH",
    culturalTheme: "farming and fishing",
    illustration: { kind: "emoji", emoji: "🌾", alt: "Farm crops" },
    narrations: [
      {
        kind: "tts",
        text: "Farmers grow food. Fishers catch fish. Both help feed the community.",
        voiceId: "english",
        language: "en",
      },
    ],
    estimatedOfflineBytes: 2_200,
    offlineEligible: true,
    rights: CULTURE_SUMMARY,
  },
  {
    id: "culture-blacksmith-intro",
    title: "Blacksmith",
    description:
      "A blacksmith heats metal and shapes tools. In many Ghanaian communities, blacksmiths make and repair useful metal objects.",
    contentType: "culture",
    discoverCategory: "africa-culture",
    levels: ["KG2", "P1", "P2", "P3"],
    subject: "Our World",
    topic: "Occupations",
    languages: ["en"],
    countryCode: "GH",
    culturalTheme: "blacksmithing",
    illustration: { kind: "emoji", emoji: "🔨", alt: "Hammer for metalwork" },
    narrations: [
      {
        kind: "tts",
        text: "A blacksmith works with hot metal to shape tools.",
        voiceId: "english",
        language: "en",
      },
    ],
    estimatedOfflineBytes: 2_100,
    offlineEligible: true,
    rights: CULTURE_SUMMARY,
  },
  {
    id: "country-ghana-profile",
    title: "Ghana",
    description:
      "Ghana is a country in West Africa. The capital city is Accra. Official anthem recordings and pledge texts are not bundled here — they require licensed or officially published sources.",
    contentType: "country_profile",
    discoverCategory: "africa-culture",
    levels: ["KG2", "P1", "P2", "P3"],
    subject: "Our World",
    topic: "Countries",
    languages: ["en"],
    countryCode: "GH",
    illustration: { kind: "emoji", emoji: "🇬🇭", alt: "Flag of Ghana" },
    narrations: [
      {
        kind: "tts",
        text: "This is Ghana. The capital city is Accra.",
        voiceId: "english",
        language: "en",
      },
    ],
    game: {
      id: "ghana-capital",
      prompt: "What is the capital of Ghana?",
      options: ["Accra", "Lagos", "Nairobi"],
      answer: "Accra",
      feedbackCorrect: "Yes — Accra is the capital of Ghana.",
      feedbackWrong: "The capital of Ghana is Accra.",
    },
    estimatedOfflineBytes: 2_300,
    offlineEligible: true,
    rights: GHANA_FACT,
  },
];

export function getMediaItemById(id: string): LearningMediaItem | undefined {
  return MEDIA_LIBRARY_CATALOG.find((item) => item.id === id);
}

export function listMediaByCategory(
  category: LearningMediaItem["discoverCategory"]
): LearningMediaItem[] {
  return MEDIA_LIBRARY_CATALOG.filter((item) => item.discoverCategory === category);
}
