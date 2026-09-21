/**
 * Spoken names for concrete objects.
 * English is always the first utterance. An African language is spoken
 * with a native voice when the device has one, otherwise with an
 * English phonetic guide so production still makes a sound.
 */

export type AfricanLanguageKey = "twi" | "hausa" | "ga" | "ewe" | "yoruba" | "swahili";

export type LocalWord = {
  /** Orthography for a native speech voice. */
  text: string;
  /** ASCII guide for an English voice when no native voice is installed. */
  phonetic: string;
};

export type PronunciationPart = {
  text: string;
  voiceId: string;
  /** Skip the orthography when the device has no voice for this language. */
  requireNative?: boolean;
  /** Spoken in English when requireNative cannot be satisfied. */
  phoneticFallback?: string;
};

const LANGUAGE_NAME: Record<AfricanLanguageKey, string> = {
  twi: "Twi",
  hausa: "Hausa",
  ga: "Ga",
  ewe: "Ewe",
  yoruba: "Yoruba",
  swahili: "Swahili",
};

export const VOICE_LANGUAGE_KEY: Record<string, AfricanLanguageKey | "english"> = {
  english: "english",
  "abena-twi": "twi",
  "kwame-twi": "twi",
  "musa-hausa": "hausa",
  "aisha-hausa": "hausa",
  "naa-ga": "ga",
  "kofi-ewe": "ewe",
  "ade-yoruba": "yoruba",
  "adaeze-yoruba": "yoruba",
  "tunde-yoruba": "yoruba",
  "zawadi-swahili": "swahili",
  "jabari-swahili": "swahili",
};

function word(
  twi: LocalWord,
  hausa: LocalWord,
  ga: LocalWord,
  ewe: LocalWord,
  yoruba: LocalWord,
  swahili: LocalWord
): Record<AfricanLanguageKey, LocalWord> {
  return { twi, hausa, ga, ewe, yoruba, swahili };
}

/** Classroom names. Loanwords stay as loanwords instead of invented translations. */
export const ITEM_PRONUNCIATION: Record<string, Record<AfricanLanguageKey, LocalWord>> = {
  apple: word(
    { text: "Aprɛ", phonetic: "ah-preh" },
    { text: "Tuffa", phonetic: "too-fah" },
    { text: "Apple", phonetic: "ah-pul" },
    { text: "Apple", phonetic: "ah-pul" },
    { text: "Ápù", phonetic: "ah-poo" },
    { text: "Tufaa", phonetic: "too-fah" }
  ),
  banana: word(
    { text: "Kwaadu", phonetic: "kwah-doo" },
    { text: "Ayaba", phonetic: "ah-yah-bah" },
    { text: "Akwadu", phonetic: "ah-kwah-doo" },
    { text: "Akadu", phonetic: "ah-kah-doo" },
    { text: "Ọgẹdẹ", phonetic: "oh-geh-deh" },
    { text: "Ndizi", phonetic: "n-dee-zee" }
  ),
  orange: word(
    { text: "Ankaa", phonetic: "ahn-kah" },
    { text: "Lemo", phonetic: "leh-moh" },
    { text: "Akutu", phonetic: "ah-koo-too" },
    { text: "Akutu", phonetic: "ah-koo-too" },
    { text: "Ọsàn", phonetic: "oh-sahn" },
    { text: "Chungwa", phonetic: "choong-wah" }
  ),
  mango: word(
    { text: "Mango", phonetic: "mahng-goh" },
    { text: "Mangwaro", phonetic: "mahng-wah-roh" },
    { text: "Mango", phonetic: "mahng-goh" },
    { text: "Mango", phonetic: "mahng-goh" },
    { text: "Mángòrò", phonetic: "mahn-goh-roh" },
    { text: "Embe", phonetic: "em-beh" }
  ),
  pawpaw: word(
    { text: "Borɔferɛ", phonetic: "baw-roh-feh-reh" },
    { text: "Gwanda", phonetic: "gwahn-dah" },
    { text: "Pawpaw", phonetic: "paw-paw" },
    { text: "Pawpaw", phonetic: "paw-paw" },
    { text: "Ìbẹpẹ", phonetic: "ee-beh-peh" },
    { text: "Papai", phonetic: "pah-pye" }
  ),
  carrot: word(
    { text: "Karɔt", phonetic: "kah-rawt" },
    { text: "Karas", phonetic: "kah-rahs" },
    { text: "Karɔt", phonetic: "kah-rawt" },
    { text: "Karɔt", phonetic: "kah-rawt" },
    { text: "Kárọ́ọ̀tì", phonetic: "kah-roh-tee" },
    { text: "Karoti", phonetic: "kah-roh-tee" }
  ),
  potato: word(
    { text: "Potato", phonetic: "poh-tay-toh" },
    { text: "Dankali", phonetic: "dahn-kah-lee" },
    { text: "Potato", phonetic: "poh-tay-toh" },
    { text: "Potato", phonetic: "poh-tay-toh" },
    { text: "Poteto", phonetic: "poh-teh-toh" },
    { text: "Kiazi", phonetic: "kee-ah-zee" }
  ),
  tomato: word(
    { text: "Ntoosi", phonetic: "n-toh-see" },
    { text: "Tumatir", phonetic: "too-mah-teer" },
    { text: "Tomato", phonetic: "toh-mah-toh" },
    { text: "Tomato", phonetic: "toh-mah-toh" },
    { text: "Tòmátì", phonetic: "toh-mah-tee" },
    { text: "Nyanya", phonetic: "nyahn-yah" }
  ),
  dog: word(
    { text: "Kraman", phonetic: "krah-mahn" },
    { text: "Kare", phonetic: "kah-ray" },
    { text: "Gbee", phonetic: "g-beh" },
    { text: "Avu", phonetic: "ah-voo" },
    { text: "Ajá", phonetic: "ah-jah" },
    { text: "Mbwa", phonetic: "m-bwah" }
  ),
  cat: word(
    { text: "Ɔkra", phonetic: "aw-krah" },
    { text: "Kyanwa", phonetic: "kyahn-wah" },
    { text: "Cat", phonetic: "cat" },
    { text: "Dadi", phonetic: "dah-dee" },
    { text: "Ológbò", phonetic: "oh-log-boh" },
    { text: "Paka", phonetic: "pah-kah" }
  ),
  chicken: word(
    { text: "Akokɔ", phonetic: "ah-kaw-kaw" },
    { text: "Kaza", phonetic: "kah-zah" },
    { text: "Wuɔ", phonetic: "woo-aw" },
    { text: "Koklɔ", phonetic: "kok-law" },
    { text: "Adiẹ", phonetic: "ah-dyeh" },
    { text: "Kuku", phonetic: "koo-koo" }
  ),
  goat: word(
    { text: "Abirekyie", phonetic: "ah-bee-reh-chyeh" },
    { text: "Akuya", phonetic: "ah-koo-yah" },
    { text: "Tooi", phonetic: "toh-ee" },
    { text: "Gbɔ̃", phonetic: "gbaw" },
    { text: "Ewúrẹ́", phonetic: "eh-woo-reh" },
    { text: "Mbuzi", phonetic: "m-boo-zee" }
  ),
  "ball-circle": word(
    { text: "Bɔɔl. Kurukuruwa", phonetic: "ball. koo-roo-koo-roo-wah" },
    { text: "Ƙwallo. Da'ira", phonetic: "kwah-loh. dah-ee-rah" },
    { text: "Ball. Circle", phonetic: "ball. sir-kul" },
    { text: "Bɔl. Circle", phonetic: "ball. sir-kul" },
    { text: "Bọọlu. Circle", phonetic: "baw-loo. sir-kul" },
    { text: "Mpira. Duara", phonetic: "m-pee-rah. doo-ah-rah" }
  ),
  "box-square": word(
    { text: "Adaka. Square", phonetic: "ah-dah-kah. skwair" },
    { text: "Akwati. Murabba'i", phonetic: "ah-kwah-tee. moo-rah-bah-ee" },
    { text: "Box. Square", phonetic: "boks. skwair" },
    { text: "Adaka. Square", phonetic: "ah-dah-kah. skwair" },
    { text: "Apoti. Square", phonetic: "ah-poh-tee. skwair" },
    { text: "Sanduku. Mraba", phonetic: "sahn-doo-koo. m-rah-bah" }
  ),
  "red-tomato": word(
    { text: "Kɔkɔɔ", phonetic: "kaw-kaw" },
    { text: "Ja", phonetic: "jah" },
    { text: "Red", phonetic: "red" },
    { text: "Dzi", phonetic: "dzee" },
    { text: "Pupa", phonetic: "poo-pah" },
    { text: "Nyekundu", phonetic: "nyeh-koo-ndoo" }
  ),
  "yellow-banana": word(
    { text: "Akokɔsradeɛ", phonetic: "ah-kaw-kaw-srah-deh" },
    { text: "Rawaya", phonetic: "rah-wah-yah" },
    { text: "Yellow", phonetic: "yeh-loh" },
    { text: "Yellow", phonetic: "yeh-loh" },
    { text: "Yellow", phonetic: "yeh-loh" },
    { text: "Manjano", phonetic: "mahn-jah-noh" }
  ),
  hands: word(
    { text: "Nsa", phonetic: "n-sah" },
    { text: "Hannu", phonetic: "hahn-noo" },
    { text: "Ninɛ", phonetic: "nee-neh" },
    { text: "Asi", phonetic: "ah-see" },
    { text: "Ọwọ́", phonetic: "oh-waw" },
    { text: "Mkono", phonetic: "m-koh-noh" }
  ),
  eyes: word(
    { text: "Ani", phonetic: "ah-nee" },
    { text: "Ido", phonetic: "ee-doh" },
    { text: "Hiɛ", phonetic: "hee-eh" },
    { text: "Ŋku", phonetic: "ng-koo" },
    { text: "Ojú", phonetic: "oh-joo" },
    { text: "Jicho", phonetic: "jee-choh" }
  ),
  nose: word(
    { text: "Hwene", phonetic: "hweh-neh" },
    { text: "Hanci", phonetic: "hahn-chee" },
    { text: "Gugɔ̃", phonetic: "goo-gong" },
    { text: "Ŋɔti", phonetic: "ngaw-tee" },
    { text: "Imú", phonetic: "ee-moo" },
    { text: "Pua", phonetic: "poo-ah" }
  ),
};

const VOICE_SAMPLES: Record<string, { english: string; native: string; phonetic: string }> = {
  english: {
    english: "Hello! I am your English teacher. Let's learn together!",
    native: "",
    phonetic: "",
  },
  "abena-twi": {
    english: "Hello! I am Abena.",
    native: "Ɛte sɛn. Me din de Abena.",
    phonetic: "Eh-teh sen. Meh deen deh Ah-beh-nah.",
  },
  "musa-hausa": {
    english: "Hello! I am Musa.",
    native: "Sannu. Sunana Musa.",
    phonetic: "Sahn-noo. Soo-nah-nah Moo-sah.",
  },
  "naa-ga": {
    english: "Hello! I am Naa.",
    native: "Ojekoo. Mi Naa.",
    phonetic: "Oh-jeh-koh. Mee Nah.",
  },
  "kofi-ewe": {
    english: "Hello! I am Kofi.",
    native: "Woezo. Nye ŋkɔe Kofi.",
    phonetic: "Weh-zoh. Nyeh ng-koh-eh Koh-fee.",
  },
  "ade-yoruba": {
    english: "Hello! I am Ade.",
    native: "Bawo. Oruko mi ni Ade.",
    phonetic: "Bah-woh. Oh-roo-koh mee nee Ah-deh.",
  },
  "zawadi-swahili": {
    english: "Hello! I am Zawadi.",
    native: "Habari. Jina langu ni Zawadi.",
    phonetic: "Hah-bah-ree. Jee-nah lahn-goo nee Zah-wah-dee.",
  },
};

export function englishPronunciationLine(title: string): string {
  const parts = title
    .split("=")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) return `${parts[0]}. ${parts[1]}.`;
  return title.trim();
}

export function languageKeyForVoice(voiceId: string | undefined): AfricanLanguageKey | "english" {
  if (!voiceId) return "english";
  return VOICE_LANGUAGE_KEY[voiceId] ?? "english";
}

export function buildItemPronunciationPlan(
  itemId: string,
  title: string,
  voiceId: string | undefined
): PronunciationPart[] {
  const english = englishPronunciationLine(title);
  const parts: PronunciationPart[] = [{ text: english, voiceId: "english" }];
  const key = languageKeyForVoice(voiceId);
  if (key === "english") return parts;

  const local = ITEM_PRONUNCIATION[itemId]?.[key];
  if (!local) return parts;

  parts.push({
    text: local.text,
    voiceId: voiceId || "english",
    requireNative: true,
    phoneticFallback: `In ${LANGUAGE_NAME[key]}: ${local.phonetic}.`,
  });
  return parts;
}

export function buildVoiceSamplePlan(voiceId: string): PronunciationPart[] {
  const sample = VOICE_SAMPLES[voiceId] ?? VOICE_SAMPLES.english;
  const parts: PronunciationPart[] = [{ text: sample.english, voiceId: "english" }];
  const key = languageKeyForVoice(voiceId);
  if (key === "english" || !sample.native) return parts;
  parts.push({
    text: sample.native,
    voiceId,
    requireNative: true,
    phoneticFallback: `In ${LANGUAGE_NAME[key]}: ${sample.phonetic}.`,
  });
  return parts;
}

export function lessonObjectForLevel(level: string): { id: string; title: string } {
  if (level === "KG2") return { id: "banana", title: "Banana" };
  if (level === "P1" || level === "P2") return { id: "orange", title: "Orange" };
  if (level === "P3") return { id: "mango", title: "Mango" };
  return { id: "apple", title: "Apple" };
}

export const PRONUNCIATION_CATEGORY_IDS = [
  "fruits",
  "vegetables",
  "animals",
  "shapes",
  "colors",
  "body",
] as const;
