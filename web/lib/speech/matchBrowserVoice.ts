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
  return tag.trim().toLowerCase();
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

function findVoice(voices: SpeechSynthesisVoice[], tag: string): SpeechSynthesisVoice | undefined {
  const wanted = normalize(tag);
  const exact = voices.find((voice) => normalize(voice.lang || "") === wanted);
  if (exact) return exact;
  return voices.find((voice) => voiceMatchesLang(voice.lang || "", tag));
}

function findFirst(
  voices: SpeechSynthesisVoice[],
  tags: string[]
): SpeechSynthesisVoice | undefined {
  for (const tag of tags) {
    const found = findVoice(voices, tag);
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
  const nativeVoice = findFirst(voices, requested);

  if (nativeVoice) {
    return {
      lang: nativeVoice.lang || config?.primary || "en-GB",
      voice: nativeVoice,
      matchedLang: nativeVoice.lang || null,
      native: true,
    };
  }

  const english =
    findFirst(voices, ENGLISH_PREFERENCE) ??
    voices.find((voice) => isEnglishTag(voice.lang || "")) ??
    null;

  if (english) {
    return {
      lang: english.lang || "en-GB",
      voice: english,
      matchedLang: english.lang || null,
      native: requestedEnglish,
    };
  }

  const any = voices[0] ?? null;
  return {
    lang: any?.lang || "en-GB",
    voice: any,
    matchedLang: any?.lang ?? null,
    native: false,
  };
}
