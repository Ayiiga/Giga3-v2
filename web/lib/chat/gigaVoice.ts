/**
 * Shared Giga3 browser TTS layer for chat — voice selection, fallback, playback, cancel.
 * Answer blocks, AfricanVoiceReader, and MessageBubbleActions all delegate here.
 */

import { stripMarkdownForSpeech } from "@/lib/chat/speechText";
import {
  matchBrowserVoice,
  type VoiceLangConfig,
} from "@/lib/speech/matchBrowserVoice";

export type GigaVoiceProfile = {
  id: string;
  name: string;
  flag: string;
  lang: string;
};

/**
 * BCP-47 tags. African profiles list only that language.
 * English is the playback stand-in when no native voice is installed,
 * and the utterance keeps the English voice's own lang tag.
 */
export const GIGA_VOICE_LANG: Record<string, VoiceLangConfig> = {
  "english-british": { primary: "en-GB", fallbacks: ["en-US", "en-GH", "en"] },
  english: { primary: "en-GB", fallbacks: ["en-US", "en-GH", "en"] },
  "abena-twi": { primary: "ak-GH", fallbacks: ["ak", "tw-GH", "tw"] },
  "kwame-twi": { primary: "ak-GH", fallbacks: ["ak", "tw-GH", "tw"] },
  "aisha-hausa": { primary: "ha-NG", fallbacks: ["ha", "ha-GH"] },
  "musa-hausa": { primary: "ha-NG", fallbacks: ["ha", "ha-GH"] },
  "naa-ga": { primary: "gaa-GH", fallbacks: ["gaa"] },
  "kofi-ewe": { primary: "ee-GH", fallbacks: ["ee"] },
  "adaeze-yoruba": { primary: "yo-NG", fallbacks: ["yo", "yo-GH"] },
  "tunde-yoruba": { primary: "yo-NG", fallbacks: ["yo", "yo-GH"] },
  "zawadi-swahili": { primary: "sw-KE", fallbacks: ["sw", "sw-TZ"] },
  "jabari-swahili": { primary: "sw-KE", fallbacks: ["sw", "sw-TZ"] },
  /** GigaLearn alias ids */
  "ade-yoruba": { primary: "yo-NG", fallbacks: ["yo", "yo-GH"] },
};

export const GIGA_CHAT_VOICES: GigaVoiceProfile[] = [
  { id: "english-british", name: "English (British)", flag: "🇬🇧", lang: "en-GB" },
  { id: "abena-twi", name: "Abena · Twi (F)", flag: "🇬🇭", lang: "ak-GH" },
  { id: "kwame-twi", name: "Kwame · Twi (M)", flag: "🇬🇭", lang: "ak-GH" },
  { id: "aisha-hausa", name: "Aisha · Hausa (F)", flag: "🇳🇬", lang: "ha-NG" },
  { id: "musa-hausa", name: "Musa · Hausa (M)", flag: "🇳🇬", lang: "ha-NG" },
  { id: "naa-ga", name: "Naa · Ga (F)", flag: "🇬🇭", lang: "gaa-GH" },
  { id: "kofi-ewe", name: "Kofi · Ewe (M)", flag: "🇬🇭", lang: "ee-GH" },
  { id: "adaeze-yoruba", name: "Adaeze · Yoruba (F)", flag: "🇳🇬", lang: "yo-NG" },
  { id: "tunde-yoruba", name: "Tunde · Yoruba (M)", flag: "🇳🇬", lang: "yo-NG" },
  { id: "zawadi-swahili", name: "Zawadi · Swahili (F)", flag: "🇰🇪", lang: "sw-KE" },
  { id: "jabari-swahili", name: "Jabari · Swahili (M)", flag: "🇰🇪", lang: "sw-KE" },
];

export type ResolvedGigaVoice = {
  lang: string;
  voice: SpeechSynthesisVoice | null;
  matchedLang: string | null;
  /** True when the installed voice matches the requested language. */
  native: boolean;
};

/** Pick the best installed browser voice for a Giga3 voice profile id. */
export function resolveBrowserVoiceForId(
  voices: SpeechSynthesisVoice[],
  voiceId?: string
): ResolvedGigaVoice {
  const config =
    (voiceId && GIGA_VOICE_LANG[voiceId]) ||
    GIGA_VOICE_LANG["english-british"];
  return matchBrowserVoice(voices, config);
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

export type SpeakGigaVoiceArgs = {
  text: string;
  voiceId?: string;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (event: SpeechSynthesisErrorEvent) => void;
};

let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeBlockId: string | null = null;

export function getActiveSpeechBlockId(): string | null {
  return activeBlockId;
}

export function isGigaVoiceSpeaking(): boolean {
  return typeof window !== "undefined" && window.speechSynthesis?.speaking === true;
}

export function isGigaVoiceSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopGigaVoice(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  activeUtterance = null;
  activeBlockId = null;
}

/** Speak plain/markdown text with the selected Giga3 voice profile. */
export async function speakGigaVoice(args: SpeakGigaVoiceArgs & { blockId?: string }): Promise<boolean> {
  if (!isGigaVoiceSupported()) return false;
  const plain = stripMarkdownForSpeech(args.text);
  if (!plain) return false;

  stopGigaVoice();

  try {
    const voices = await loadBrowserVoices();
    const resolved = resolveBrowserVoiceForId(voices, args.voiceId);

    const utterance = new SpeechSynthesisUtterance(plain.slice(0, 2000));
    utterance.lang = resolved.lang;
    if (resolved.voice) utterance.voice = resolved.voice;
    utterance.rate = args.rate ?? 1;
    utterance.pitch = args.pitch ?? 1;

    utterance.onstart = () => {
      args.onStart?.();
    };
    utterance.onend = () => {
      if (activeUtterance === utterance) {
        activeUtterance = null;
        activeBlockId = null;
      }
      args.onEnd?.();
    };
    utterance.onerror = (event) => {
      if (activeUtterance === utterance) {
        activeUtterance = null;
        activeBlockId = null;
      }
      args.onError?.(event);
      args.onEnd?.();
    };

    activeUtterance = utterance;
    activeBlockId = args.blockId ?? null;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    activeUtterance = null;
    activeBlockId = null;
    return false;
  }
}

/** Toggle: stop if the same block is already speaking; otherwise start it. */
export async function toggleGigaVoiceBlock(args: SpeakGigaVoiceArgs & { blockId: string }): Promise<boolean> {
  if (isGigaVoiceSpeaking() && activeBlockId === args.blockId) {
    stopGigaVoice();
    return false;
  }
  return speakGigaVoice(args);
}
