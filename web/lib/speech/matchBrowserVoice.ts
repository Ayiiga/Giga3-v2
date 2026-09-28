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

function findVoice(
  voices: SpeechSynthesisVoice[],
  tag: string,
  localOnly: boolean
): SpeechSynthesisVoice | undefined {
  const pool = voicesForTag(voices, tag);
  if (localOnly) return pool.find(isLocalVoice);
  return pool.find(isLocalVoice) ?? pool[0];
}

function findFirst(
  voices: SpeechSynthesisVoice[],
  tags: string[],
  localOnly = false
): SpeechSynthesisVoice | undefined {
  for (const tag of tags) {
    const found = findVoice(voices, tag, localOnly);
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
  // On-device voices stay smooth on mobile data. A remote en-GB voice must not
  // beat a local en-US voice, or English playback stutters and drops.
  const nativeVoice =
    findFirst(voices, requested, true) ?? findFirst(voices, requested, false);

  if (nativeVoice) {
    return {
      lang: speechLangTag(nativeVoice.lang, config?.primary || "en-GB"),
      voice: nativeVoice,
      matchedLang: nativeVoice.lang || null,
      native: true,
    };
  }

  const english =
    findFirst(voices, ENGLISH_PREFERENCE, true) ??
    findFirst(voices, ENGLISH_PREFERENCE, false) ??
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
