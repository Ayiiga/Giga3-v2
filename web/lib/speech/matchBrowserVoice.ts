/**
 * Strict browser-voice matching.
 * A tag matches only itself or a regional variant of the same tag
 * (`ak` ↔ `ak-GH`). `en-GB` does not match `en-US`.
 * The spoken `lang` is always the installed voice's own tag so the
 * engine does not reject the utterance.
 */

export type VoiceLangConfig = {
  primary: string;
  fallbacks: string[];
  /**
   * When set, rank English/male browser voices toward warmer, more natural
   * options. Female GigaLearn profiles must omit this so their matching is unchanged.
   */
  preferWarmMale?: boolean;
};

export type MatchedBrowserVoice = {
  /** BCP-47 tag to assign on the utterance — the voice's own lang when one is chosen. */
  lang: string;
  voice: SpeechSynthesisVoice | null;
  matchedLang: string | null;
  /** True when the chosen voice is in the requested language, not an English stand-in. */
  native: boolean;
};

const ENGLISH_PREFERENCE = ["en-GB", "en-US", "en-GH", "en"];

function normalize(tag: string): string {
  return tag.trim().toLowerCase().replace(/_/g, "-");
}

/** Android WebView sometimes reports `en_US`. SpeechSynthesis expects `en-US`. */
export function speechLangTag(tag: string | null | undefined, fallback = "en"): string {
  const normalized = (tag || "").trim().replace(/_/g, "-");
  return normalized || fallback;
}

export function voiceMatchesLang(voiceLang: string, tag: string): boolean {
  const v = normalize(voiceLang);
  const t = normalize(tag);
  if (!v || !t) return false;
  if (v === t) return true;
  if (v.startsWith(`${t}-`)) return true;
  if (t.startsWith(`${v}-`)) return true;
  return false;
}

function isEnglishTag(tag: string): boolean {
  const t = normalize(tag);
  return t === "en" || t.startsWith("en-");
}

function isLocalVoice(voice: SpeechSynthesisVoice): boolean {
  return voice.localService !== false;
}

function voicesForTag(voices: SpeechSynthesisVoice[], tag: string): SpeechSynthesisVoice[] {
  const wanted = normalize(tag);
  const exact = voices.filter((voice) => normalize(voice.lang || "") === wanted);
  const pool =
    exact.length > 0
      ? exact
      : voices.filter((voice) => voiceMatchesLang(voice.lang || "", tag));
  return pool;
}

/** Score warmer natural male voices higher; keep female matching paths untouched. */
export function scoreWarmMaleVoice(voice: SpeechSynthesisVoice): number {
  const name = `${voice.name || ""} ${voice.voiceURI || ""}`.toLowerCase();
  let score = 0;
  if (/(neural|natural|enhanced|premium|wavenet|studio|journey|onyx|echo)/.test(name)) score += 8;
  if (/(male|man|david|daniel|arthur|thomas|james|google uk english male)/.test(name)) score += 4;
  if (/(female|woman|samantha|karen|zira|google uk english female|abena|naa)/.test(name)) score -= 12;
  if (/(espeak|compact|robot|mbrola)/.test(name)) score -= 6;
  if (isLocalVoice(voice)) score += 2;
  return score;
}

function pickBest(
  pool: SpeechSynthesisVoice[],
  preferWarmMale: boolean
): SpeechSynthesisVoice | undefined {
  if (pool.length === 0) return undefined;
  if (!preferWarmMale) return pool.find(isLocalVoice) ?? pool[0];
  return [...pool].sort((a, b) => scoreWarmMaleVoice(b) - scoreWarmMaleVoice(a))[0];
}

function findVoice(
  voices: SpeechSynthesisVoice[],
  tag: string,
  localOnly: boolean,
  preferWarmMale: boolean
): SpeechSynthesisVoice | undefined {
  const pool = voicesForTag(voices, tag);
  const scoped = localOnly ? pool.filter(isLocalVoice) : pool;
  return pickBest(scoped, preferWarmMale);
}

function findFirst(
  voices: SpeechSynthesisVoice[],
  tags: string[],
  localOnly = false,
  preferWarmMale = false
): SpeechSynthesisVoice | undefined {
  for (const tag of tags) {
    const found = findVoice(voices, tag, localOnly, preferWarmMale);
    if (found) return found;
  }
  return undefined;
}

export function matchBrowserVoice(
  voices: SpeechSynthesisVoice[],
  config?: VoiceLangConfig
): MatchedBrowserVoice {
  const requested = config ? [config.primary, ...config.fallbacks] : ["en-GB", "en-US", "en"];
  const requestedEnglish = !config || isEnglishTag(config.primary);
  const preferWarmMale = Boolean(config?.preferWarmMale);
  // On-device voices stay smooth on mobile data. A remote en-GB voice must not
  // beat a local en-US voice, or English playback stutters and drops.
  const nativeVoice =
    findFirst(voices, requested, true, preferWarmMale) ??
    findFirst(voices, requested, false, preferWarmMale);

  if (nativeVoice) {
    return {
      lang: speechLangTag(nativeVoice.lang, config?.primary || "en-GB"),
      voice: nativeVoice,
      matchedLang: nativeVoice.lang || null,
      native: true,
    };
  }

  const english =
    findFirst(voices, ENGLISH_PREFERENCE, true, preferWarmMale) ??
    findFirst(voices, ENGLISH_PREFERENCE, false, preferWarmMale) ??
    voices.find((voice) => isEnglishTag(voice.lang || "")) ??
    null;

  if (english) {
    return {
      lang: speechLangTag(english.lang, "en-GB"),
      voice: english,
      matchedLang: english.lang || null,
      native: requestedEnglish,
    };
  }

  const any = voices.find(isLocalVoice) ?? voices[0] ?? null;
  return {
    lang: speechLangTag(any?.lang, "en"),
    voice: any,
    matchedLang: any?.lang ?? null,
    native: false,
  };
}
