/**
 * Ghana Discover catalogue — Phase 1 reference + Phase 2 expansion shards.
 * Nigeria and other countries stay empty until educator-reviewed content exists.
 */

import { GHANA_PHASE2_CULTURE } from "@/lib/gigalearn/mediaLibrary/catalog.ghana.culture";
import { GHANA_PHASE2_GAMES } from "@/lib/gigalearn/mediaLibrary/catalog.ghana.games";
import { GHANA_KG2_VISUAL_EXPANSION } from "@/lib/gigalearn/mediaLibrary/catalog.ghana.kg2Expansion";
import { GHANA_PHASE2_PICTURES } from "@/lib/gigalearn/mediaLibrary/catalog.ghana.pictures";
import { GHANA_PHASE2_RHYMES } from "@/lib/gigalearn/mediaLibrary/catalog.ghana.rhymes";
import { GHANA_PHASE2_SONGS } from "@/lib/gigalearn/mediaLibrary/catalog.ghana.songs";
import { GHANA_PHASE2_STORIES } from "@/lib/gigalearn/mediaLibrary/catalog.ghana.stories";
import { GHANA_PHASE2_VIDEOS } from "@/lib/gigalearn/mediaLibrary/catalog.ghana.videos";
import type { LearningMediaItem } from "@/lib/gigalearn/mediaLibrary/types";

const MEDIA = "/gigalearn/media/ghana/kg2";
const HQ = `${MEDIA}/hq`;

const ORIGINAL_ART = {
  source: "Original Giga3 educational SVG illustrations for Ghana KG2",
  rights: "original",
  reviewed: true,
  reviewedAt: "2026-10-09",
} as const;

const HQ_PHOTO_ART = {
  source:
    "Original Giga3 AI-generated photographic educational assets (fal.ai) for Ghana KG2 — educator visual review pending",
  rights: "original",
  reviewed: false,
  reviewedAt: "2026-10-09",
} as const;

const HQ_STORY_ART = {
  source:
    "Original Giga3 AI-generated storybook illustration (fal.ai) for Ghana KG2 Ananse story — educator visual review pending",
  rights: "original",
  reviewed: false,
  reviewedAt: "2026-10-09",
} as const;

const GENERATED_SPEECH = {
  source:
    "Generated educational speech (espeak-ng en+m3 warmer male) for offline packaging — not educator-reviewed native-speaker recordings; replace before certification claims",
  rights: "original",
  reviewed: false,
} as const;

const ART_PLUS_GENERATED_SPEECH = {
  source: `${ORIGINAL_ART.source}; ${GENERATED_SPEECH.source}`,
  rights: "original",
  reviewed: false,
} as const;

const ORIGINAL_RHYME = {
  source:
    "Original Giga3 educational rhyme text; spoken audio is generated (espeak-ng en+m3), not educator-reviewed native speech",
  rights: "original",
  reviewed: false,
} as const;

const ORIGINAL_VIDEO = {
  source:
    "Original Giga3 educational storyboard video from GigaLearn SVG art; narration track is generated (espeak-ng en+m3), not educator-reviewed native speech",
  rights: "original",
  reviewed: false,
} as const;

const GHANA_FACT = {
  source: "Widely documented public geographic facts about Ghana (capital Accra)",
  rights: "public-domain-facts",
  reviewed: true,
  reviewedAt: "2026-10-08",
} as const;

const CULTURE_SUMMARY = {
  source:
    "Age-appropriate summaries of widely documented Ghanaian cultural practices for classroom introduction",
  rights: "curriculum-aligned-summary",
  reviewed: false,
} as const;

const KG2_AGE = { minAge: 4, maxAge: 5, label: "KG2 (ages 4–5)" } as const;
const EARLY_AGE = { minAge: 3, maxAge: 6, label: "Early years (ages 3–6)" } as const;

const GH = {
  countryId: "ghana",
  countryCode: "GH",
  regionScope: "country" as const,
  curriculumId: "gh-ccp",
};

function remote(
  path: string,
  mimeType: string,
  estimatedBytes: number,
  required = true,
  base: string = MEDIA
): NonNullable<LearningMediaItem["remoteMedia"]>[number] {
  return {
    kind: "remote",
    url: `${base}/${path}`,
    mimeType,
    estimatedBytes,
    required,
  };
}

function hqPoster(
  filename: string,
  alt: string,
  estimatedBytes: number
): NonNullable<LearningMediaItem["posterImage"]> {
  return {
    url: `${HQ}/${filename}`,
    alt,
    mimeType: "image/webp",
    estimatedBytes,
    aspectRatio: "1:1",
  };
}

/** Phase 1 seed packs — remapped into Phase 2 Discover categories. */
export const GHANA_PHASE1_SEED: LearningMediaItem[] = [
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
    ...GH,
    curriculumLevelId: "kg-2",
    curriculumNote: "Ghana Early Years — concrete objects and oral language",
    ageSuitability: KG2_AGE,
    illustration: { kind: "emoji", emoji: "🥭", alt: "Mango fruit" },
    posterImage: hqPoster(
      "mango.webp",
      "A ripe orange-yellow mango on a woven mat in soft daylight",
      69952
    ),
    narrations: [
      { kind: "tts", text: "Mango", voiceId: "english", language: "en" },
      { kind: "tts", text: "Mango", voiceId: "abena-twi", language: "tw" },
    ],
    remoteMedia: [
      remote("mango.webp", "image/webp", 69952, true, HQ),
      remote("mango.svg", "image/svg+xml", 501, false),
      remote("mango-en.mp3", "audio/mpeg", 5146),
      remote("mango-tw.mp3", "audio/mpeg", 5327),
    ],
    game: {
      id: "find-mango",
      prompt: "Which one is the mango?",
      options: ["🍎 Apple", "🥭 Mango", "🍌 Banana"],
      answer: "🥭 Mango",
      feedbackCorrect: "Yes! That is a mango. Well done!",
      feedbackWrong: "Try again. Look for the orange mango.",
    },
    estimatedOfflineBytes: 80_926,
    offlineEligible: true,
    rights: {
      ...ART_PLUS_GENERATED_SPEECH,
      source: `${HQ_PHOTO_ART.source}; ${GENERATED_SPEECH.source}`,
      reviewed: false,
    },
  },
  {
    id: "pic-pawpaw-kg2",
    title: "Pawpaw",
    description: "See a pawpaw (papaya), hear English and Ga labels, then choose the right fruit.",
    contentType: "picture_card",
    discoverCategory: "pictures-objects",
    levels: ["KG1", "KG2", "P1"],
    subject: "Our World",
    topic: "Fruits",
    languages: ["en", "gaa"],
    ...GH,
    curriculumLevelId: "kg-2",
    curriculumNote: "Ghana Early Years — concrete objects and oral language",
    ageSuitability: KG2_AGE,
    illustration: { kind: "emoji", emoji: "🍈", alt: "Pawpaw fruit" },
    posterImage: hqPoster(
      "pawpaw.webp",
      "A whole green and yellow pawpaw fruit on a wooden stool outdoors",
      55396
    ),
    narrations: [
      { kind: "tts", text: "Pawpaw", voiceId: "english", language: "en" },
      { kind: "tts", text: "Pawpaw", voiceId: "naa-ga", language: "gaa" },
    ],
    remoteMedia: [
      remote("pawpaw.webp", "image/webp", 55396, true, HQ),
      remote("pawpaw.svg", "image/svg+xml", 640, false),
      remote("pawpaw-en.mp3", "audio/mpeg", 4962),
      remote("pawpaw-gaa.mp3", "audio/mpeg", 4962),
    ],
    game: {
      id: "find-pawpaw",
      prompt: "Which one is the pawpaw?",
      options: ["🍈 Pawpaw", "🍌 Banana", "🍊 Orange"],
      answer: "🍈 Pawpaw",
      feedbackCorrect: "Yes! That is a pawpaw.",
      feedbackWrong: "Look again for the round green pawpaw.",
    },
    estimatedOfflineBytes: 65_960,
    offlineEligible: true,
    rights: {
      ...ART_PLUS_GENERATED_SPEECH,
      source: `${HQ_PHOTO_ART.source}; ${GENERATED_SPEECH.source}`,
      reviewed: false,
    },
  },
  {
    id: "pic-drum-kg2",
    title: "Talking drum",
    description: "Meet a drum used in Ghanaian music and storytelling gatherings.",
    contentType: "picture_card",
    discoverCategory: "culture-occupations",
    levels: ["KG2", "P1", "P2"],
    subject: "Creative Arts",
    topic: "Musical instruments",
    languages: ["en", "ee"],
    ...GH,
    curriculumLevelId: "kg-2",
    curriculumNote: "Ghana Early Years — Creative Arts awareness",
    culturalTheme: "drumming",
    ageSuitability: KG2_AGE,
    illustration: { kind: "emoji", emoji: "🥁", alt: "Drum" },
    posterImage: hqPoster(
      "talking-drum.webp",
      "A wooden hourglass talking drum with leather cords in soft light",
      117610
    ),
    narrations: [
      { kind: "tts", text: "Drum", voiceId: "english", language: "en" },
      {
        kind: "tts",
        text: "This is a drum. People play drums with their hands.",
        voiceId: "english",
        language: "en",
      },
      { kind: "tts", text: "Drum", voiceId: "kofi-ewe", language: "ee" },
    ],
    remoteMedia: [
      remote("talking-drum.webp", "image/webp", 117610, true, HQ),
      remote("drum.svg", "image/svg+xml", 544, false),
      remote("drum-en.mp3", "audio/mpeg", 3819),
      remote("drum-en-long.mp3", "audio/mpeg", 21175),
    ],
    game: {
      id: "find-drum",
      prompt: "Which picture is a drum?",
      options: ["🎸 Guitar", "🥁 Drum", "🎺 Trumpet"],
      answer: "🥁 Drum",
      feedbackCorrect: "Great listening eyes! That is a drum.",
      feedbackWrong: "Not yet. Find the round drum.",
    },
    estimatedOfflineBytes: 143_148,
    offlineEligible: true,
    rights: {
      ...ART_PLUS_GENERATED_SPEECH,
      source: `${HQ_PHOTO_ART.source}; ${GENERATED_SPEECH.source}`,
      reviewed: false,
    },
  },
  {
    id: "game-count-bananas-kg2",
    title: "Count the bananas",
    description: "A short counting game with bananas for KG2 learners.",
    contentType: "game",
    discoverCategory: "games",
    levels: ["KG1", "KG2"],
    subject: "Numeracy",
    topic: "Counting 1–10",
    languages: ["en", "tw"],
    ...GH,
    curriculumLevelId: "kg-2",
    curriculumNote: "Ghana Early Years numeracy — concrete counting",
    ageSuitability: KG2_AGE,
    illustration: { kind: "emoji", emoji: "🍌", alt: "Bananas" },
    posterImage: hqPoster(
      "bananas-four.webp",
      "Exactly four yellow bananas arranged clearly for counting",
      32432
    ),
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
    remoteMedia: [
      remote("bananas-four.webp", "image/webp", 32432, true, HQ),
      remote("bananas.svg", "image/svg+xml", 510, false),
      remote("bananas-en.mp3", "audio/mpeg", 22157),
    ],
    game: {
      id: "count-bananas-4",
      prompt: "How many bananas? 🍌🍌🍌🍌",
      options: ["3", "4", "5"],
      answer: "4",
      feedbackCorrect: "Yes! Four bananas.",
      feedbackWrong: "Count again slowly: one, two, three, four.",
    },
    estimatedOfflineBytes: 55_099,
    offlineEligible: true,
    rights: {
      ...ART_PLUS_GENERATED_SPEECH,
      source: `${HQ_PHOTO_ART.source}; ${GENERATED_SPEECH.source}`,
      reviewed: false,
    },
  },
  {
    id: "rhyme-mango-sweet",
    title: "Mango Sweet",
    description: "A short original fruit rhyme in English and Twi.",
    contentType: "rhyme_song",
    discoverCategory: "rhymes-poems",
    levels: ["Creche", "KG1", "KG2", "P1"],
    subject: "Language",
    topic: "Nursery rhymes",
    languages: ["en", "tw"],
    ...GH,
    curriculumLevelId: "kg-2",
    curriculumNote: "Ghana Early Years — oral language and rhyme",
    ageSuitability: EARLY_AGE,
    illustration: { kind: "emoji", emoji: "🥭", alt: "Mango rhyme" },
    posterImage: hqPoster(
      "mango.webp",
      "A ripe orange-yellow mango on a woven mat in soft daylight",
      69952
    ),
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
    remoteMedia: [
      remote("mango.webp", "image/webp", 69952, true, HQ),
      remote("mango.svg", "image/svg+xml", 501, false),
      remote("rhyme-mango-en.mp3", "audio/mpeg", 27892),
      remote("rhyme-mango-tw.mp3", "audio/mpeg", 28981),
    ],
    estimatedOfflineBytes: 127_326,
    offlineEligible: true,
    rights: {
      ...ORIGINAL_RHYME,
      source: `${ORIGINAL_RHYME.source}; ${HQ_PHOTO_ART.source}`,
    },
  },
  {
    id: "story-ananse-listen",
    title: "Ananse listens",
    description:
      "A short original story video about Ananse the spider — a familiar figure in Ghanaian storytelling.",
    contentType: "video_story",
    discoverCategory: "african-stories",
    levels: ["KG2", "P1", "P2"],
    subject: "Language",
    topic: "Stories",
    languages: ["en"],
    ...GH,
    curriculumLevelId: "kg-2",
    curriculumNote: "Ghana Early Years — listening and stories",
    culturalTheme: "storytelling",
    ageSuitability: KG2_AGE,
    illustration: { kind: "emoji", emoji: "🕷️", alt: "Ananse the spider" },
    posterImage: hqPoster(
      "ananse-listens.webp",
      "Storybook illustration of Ananse the spider sitting under a shade tree, listening carefully",
      259716
    ),
    narrations: [
      {
        kind: "tts",
        text: "Ananse sat under a big tree. He listened carefully. Good listeners learn new things.",
        voiceId: "english",
        language: "en",
      },
    ],
    remoteMedia: [
      remote("ananse-listens.webp", "image/webp", 259716, true, HQ),
      remote("ananse.svg", "image/svg+xml", 660, false),
      remote("ananse-en.mp3", "audio/mpeg", 36427),
      remote("ananse-listens.mp4", "video/mp4", 86905),
    ],
    game: {
      id: "ananse-listen-q",
      prompt: "What did Ananse do under the tree?",
      options: ["He listened", "He flew", "He cooked"],
      answer: "He listened",
      feedbackCorrect: "Yes! Ananse listened carefully.",
      feedbackWrong: "Listen again to the story.",
    },
    estimatedOfflineBytes: 383_708,
    offlineEligible: true,
    rights: {
      ...ORIGINAL_VIDEO,
      source: `${ORIGINAL_VIDEO.source}; ${HQ_STORY_ART.source}`,
      reviewed: false,
    },
  },
  {
    id: "culture-kente-intro",
    title: "Kente cloth",
    description:
      "Kente is a handwoven cloth tradition associated with Ashanti and Ewe communities in Ghana. Weavers make colourful patterns on a loom.",
    contentType: "culture",
    discoverCategory: "culture-occupations",
    levels: ["KG2", "P1", "P2", "P3"],
    subject: "Our World",
    topic: "Crafts",
    languages: ["en"],
    ...GH,
    curriculumLevelId: "kg-2",
    curriculumNote: "Ghana Early Years — Our World / culture awareness",
    culturalTheme: "kente weaving",
    ageSuitability: KG2_AGE,
    illustration: { kind: "emoji", emoji: "🧵", alt: "Cloth and thread" },
    posterImage: hqPoster(
      "kente.webp",
      "Bright woven kente cloth with geometric yellow, green, blue and red strips",
      214202
    ),
    narrations: [
      {
        kind: "tts",
        text: "Kente is a colourful cloth. Skilled weavers make it on a loom.",
        voiceId: "english",
        language: "en",
      },
    ],
    remoteMedia: [
      remote("kente.webp", "image/webp", 214202, true, HQ),
      remote("kente.svg", "image/svg+xml", 689, false),
      remote("kente-en.mp3", "audio/mpeg", 27398),
    ],
    game: {
      id: "kente-q",
      prompt: "Kente cloth is made by…",
      options: ["Weavers on a loom", "Cooking in a pot", "Flying a kite"],
      answer: "Weavers on a loom",
      feedbackCorrect: "Yes — weavers make kente on a loom.",
      feedbackWrong: "Think about cloth and weaving.",
    },
    estimatedOfflineBytes: 242_289,
    offlineEligible: true,
    rights: {
      ...CULTURE_SUMMARY,
      source: `${CULTURE_SUMMARY.source}; ${HQ_PHOTO_ART.source}`,
      reviewed: false,
    },
  },
  {
    id: "country-ghana-profile",
    title: "Ghana",
    description:
      "Ghana is a country in West Africa. The capital city is Accra. Official anthem recordings and pledge texts are not bundled here — they require licensed or officially published sources.",
    contentType: "country_profile",
    discoverCategory: "culture-occupations",
    levels: ["KG2", "P1", "P2", "P3"],
    subject: "Our World",
    topic: "Countries",
    languages: ["en"],
    ...GH,
    curriculumLevelId: "kg-2",
    curriculumNote: "Ghana Early Years — Our World / countries",
    ageSuitability: KG2_AGE,
    illustration: { kind: "emoji", emoji: "🇬🇭", alt: "Flag of Ghana" },
    posterImage: hqPoster(
      "ghana-flag.webp",
      "The flag of Ghana waving outdoors with red gold green and black star",
      76912
    ),
    remoteMedia: [
      remote("ghana-flag.webp", "image/webp", 76912, true, HQ),
    ],
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
    estimatedOfflineBytes: 79_212,
    offlineEligible: true,
    rights: {
      ...GHANA_FACT,
      source: `${GHANA_FACT.source}. Flag poster: ${HQ_PHOTO_ART.source}`,
      // Geographic facts remain educator-acceptable public facts; flag art still awaits visual review in the asset manifest.
    },
  },
];

export const GHANA_MEDIA_CATALOG: LearningMediaItem[] = [
  ...GHANA_PHASE1_SEED,
  ...GHANA_KG2_VISUAL_EXPANSION,
  ...GHANA_PHASE2_RHYMES,
  ...GHANA_PHASE2_SONGS,
  ...GHANA_PHASE2_STORIES,
  ...GHANA_PHASE2_VIDEOS,
  ...GHANA_PHASE2_PICTURES,
  ...GHANA_PHASE2_CULTURE,
  ...GHANA_PHASE2_GAMES,
];

/** Ids in the HQ-backed KG2 multimedia slice (required local assets when offline). */
export const GHANA_KG2_MEDIA_SLICE_IDS = [
  "pic-mango-kg2",
  "pic-pawpaw-kg2",
  "pic-drum-kg2",
  "game-count-bananas-kg2",
  "rhyme-mango-sweet",
  "story-ananse-listen",
  "culture-kente-intro",
  "country-ghana-profile",
  "pic-pineapple-kg2",
  "pic-plantain-kg2",
  "pic-dog-kg2",
  "pic-cat-kg2",
  "pic-pencil-kg2",
  "pic-table-kg2",
  "pic-school-bag-kg2",
  "pic-market-seller-kg2",
  "pic-nurse-kg2",
  "pic-ghana-flag-kg2",
  "pic-basket-kg2",
  // Phase 2 picture cards with HQ posters
  "pic-p2-1",
  "pic-p2-2",
  "pic-p2-3",
  "pic-p2-4",
  "pic-p2-5",
  "pic-p2-6",
  "pic-p2-7",
  "pic-p2-8",
  "pic-p2-9",
  "pic-p2-10",
  "pic-p2-11",
  "pic-p2-12",
  "pic-p2-13",
  "pic-p2-14",
  "pic-p2-15",
  "pic-p2-16",
  "pic-p2-17",
  "pic-p2-18",
  "pic-p2-19",
  "pic-p2-20",
  "culture-p2-potter",
  "game-p2-count-5",
] as const;

export function countGhanaCatalogByKind(catalog: LearningMediaItem[] = GHANA_MEDIA_CATALOG) {
  return {
    total: catalog.length,
    rhymesPoems: catalog.filter((i) => i.discoverCategory === "rhymes-poems").length,
    songs: catalog.filter((i) => i.discoverCategory === "songs").length,
    africanStories: catalog.filter((i) => i.discoverCategory === "african-stories").length,
    videosAnimation: catalog.filter((i) => i.discoverCategory === "videos-animation").length,
    picturesObjects: catalog.filter((i) => i.discoverCategory === "pictures-objects").length,
    animalsNature: catalog.filter((i) => i.discoverCategory === "animals-nature").length,
    numbersLetters: catalog.filter((i) => i.discoverCategory === "numbers-letters").length,
    cultureOccupations: catalog.filter((i) => i.discoverCategory === "culture-occupations").length,
    games: catalog.filter((i) => i.discoverCategory === "games").length,
  };
}
