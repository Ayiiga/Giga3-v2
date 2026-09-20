import type { GigaLearnVoice } from "@/lib/gigalearn/concreteObjects";

/** BCP-47 tags and broader fallbacks for browser voice matching. */
export const GIGALEARN_VOICE_LANG: Record<
  string,
  { primary: string; fallbacks: string[] }
> = {
  "abena-twi": { primary: "tw-GH", fallbacks: ["tw", "ak", "en-GH", "en"] },
  "musa-hausa": { primary: "ha-NG", fallbacks: ["ha", "en-NG", "en"] },
  "naa-ga": { primary: "en-GH", fallbacks: ["en"] },
  "kofi-ewe": { primary: "ee-GH", fallbacks: ["ee", "en-GH", "en"] },
  "ade-yoruba": { primary: "yo-NG", fallbacks: ["yo", "en-NG", "en"] },
  "zawadi-swahili": { primary: "sw-KE", fallbacks: ["sw", "en-KE", "en"] },
};

export type ResolvedSpeechVoice = {
  lang: string;
  voice: SpeechSynthesisVoice | null;
  matchedLang: string | null;
};

function langPrefix(tag: string): string {
  return tag.split("-")[0]?.toLowerCase() ?? tag.toLowerCase();
}

function voiceMatchesLang(voice: SpeechSynthesisVoice, tag: string): boolean {
  const v = voice.lang?.toLowerCase() ?? "";
  const t = tag.toLowerCase();
  return v === t || v.startsWith(`${t}-`) || langPrefix(v) === langPrefix(t);
}

/** Pure resolver — pick the best installed browser voice for a GigaLearn profile. */
export function resolveBrowserVoiceForProfile(
  voices: SpeechSynthesisVoice[],
  voiceId?: string
): ResolvedSpeechVoice {
  const config = voiceId ? GIGALEARN_VOICE_LANG[voiceId] : undefined;
  const candidates = config
    ? [config.primary, ...config.fallbacks]
    : ["en-GH", "en"];

  for (const tag of candidates) {
    const exact = voices.find((v) => voiceMatchesLang(v, tag) && v.lang.toLowerCase() === tag.toLowerCase());
    if (exact) return { lang: tag, voice: exact, matchedLang: tag };

    const prefix = voices.find((v) => voiceMatchesLang(v, tag));
    if (prefix) return { lang: tag, voice: prefix, matchedLang: prefix.lang };
  }

  const english =
    voices.find((v) => v.lang?.toLowerCase().startsWith("en")) ?? voices[0] ?? null;
  return {
    lang: english?.lang ?? "en",
    voice: english,
    matchedLang: english?.lang ?? null,
  };
}

let voicesChangedHandler: (() => void) | null = null;

function detachVoicesChanged(): void {
  if (typeof window === "undefined" || !voicesChangedHandler) return;
  window.speechSynthesis.removeEventListener("voiceschanged", voicesChangedHandler);
  voicesChangedHandler = null;
}

/** Load browser voices; waits for voiceschanged when the first read is empty. */
export function loadBrowserVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve([]);
  }

  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) return Promise.resolve(existing);

  return new Promise((resolve) => {
    let settled = false;

    const finish = (voices: SpeechSynthesisVoice[]) => {
      if (settled) return;
      settled = true;
      detachVoicesChanged();
      resolve(voices);
    };

    voicesChangedHandler = () => {
      finish(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", voicesChangedHandler);

    window.setTimeout(() => {
      finish(window.speechSynthesis.getVoices());
    }, 250);
  });
}

export type SpeakWithGigaLearnVoiceArgs = {
  text: string;
  voiceId?: string;
  rate?: number;
  pitch?: number;
  onEnd?: () => void;
};

/** Speak using browser TTS with language/voice selection from a GigaLearn profile. */
export async function speakWithGigaLearnVoice(args: SpeakWithGigaLearnVoiceArgs): Promise<boolean> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const trimmed = args.text?.trim();
  if (!trimmed) return false;

  try {
    window.speechSynthesis.cancel();
    const voices = await loadBrowserVoices();
    const resolved = resolveBrowserVoiceForProfile(voices, args.voiceId);

    const utter = new SpeechSynthesisUtterance(trimmed);
    utter.lang = resolved.lang;
    if (resolved.voice) utter.voice = resolved.voice;
    utter.rate = args.rate ?? 0.9;
    utter.pitch = args.pitch ?? 1.1;
    if (args.onEnd) utter.onend = args.onEnd;

    window.speechSynthesis.speak(utter);
    return true;
  } catch {
    return false;
  }
}

export function voiceProfileLanguageLabel(voice: GigaLearnVoice | undefined): string {
  if (!voice) return "English";
  return voice.language.split("·")[0]?.trim() || voice.language;
}
