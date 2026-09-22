/**
 * Shared Giga3 browser TTS layer for chat — voice selection, fallback, playback, cancel.
 * Answer blocks, AfricanVoiceReader, and MessageBubbleActions all delegate here.
 */

import { stripMarkdownForSpeech } from "@/lib/chat/speechText";
import { chunkSpeechText } from "@/lib/speech/chunkSpeechText";
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
    }, 700);
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
let playbackSession = 0;
let playbackActive = false;
/** Chrome drops utterances that are not still referenced from JS. */
let retainedUtterances: SpeechSynthesisUtterance[] = [];
let playbackWatchdog: ReturnType<typeof setInterval> | null = null;

const CANCEL_GAP_MS = 60;
const RESUME_WATCHDOG_MS = 2500;

function clearPlaybackWatchdog(): void {
  if (playbackWatchdog == null) return;
  clearInterval(playbackWatchdog);
  playbackWatchdog = null;
}

export function getActiveSpeechBlockId(): string | null {
  return activeBlockId;
}

export function isGigaVoiceSpeaking(): boolean {
  if (playbackActive) return true;
  return typeof window !== "undefined" && window.speechSynthesis?.speaking === true;
}

export function isGigaVoiceSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopGigaVoice(): void {
  playbackSession += 1;
  playbackActive = false;
  activeUtterance = null;
  activeBlockId = null;
  retainedUtterances = [];
  clearPlaybackWatchdog();
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

function speechErrorCode(event: SpeechSynthesisErrorEvent): string {
  const code = event?.error;
  return typeof code === "string" ? code : "";
}

function isBenignSpeechError(code: string): boolean {
  return code === "interrupted" || code === "canceled" || code === "cancelled";
}

function canRetryWithoutVoice(code: string): boolean {
  return (
    code === "synthesis-failed" ||
    code === "network" ||
    code === "language-unavailable" ||
    code === "voice-unavailable" ||
    code === "audio-busy"
  );
}

/** Speak plain/markdown text with the selected Giga3 voice profile. */
export async function speakGigaVoice(args: SpeakGigaVoiceArgs & { blockId?: string }): Promise<boolean> {
  if (!isGigaVoiceSupported()) return false;
  const plain = stripMarkdownForSpeech(args.text);
  const chunks = chunkSpeechText(plain, 200);
  if (chunks.length === 0) return false;

  stopGigaVoice();
  const session = playbackSession;
  playbackActive = true;
  activeBlockId = args.blockId ?? null;

  const release = () => {
    if (session !== playbackSession) return;
    playbackActive = false;
    activeUtterance = null;
    activeBlockId = null;
    retainedUtterances = [];
    clearPlaybackWatchdog();
  };

  try {
    const voices = await loadBrowserVoices();
    if (session !== playbackSession) return false;
    const resolved = resolveBrowserVoiceForId(voices, args.voiceId);

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, CANCEL_GAP_MS);
    });
    if (session !== playbackSession) return false;

    const synth = window.speechSynthesis;
    const resumeEngine = () => {
      try {
        synth.resume();
      } catch {
        /* ignore */
      }
    };
    resumeEngine();
    clearPlaybackWatchdog();
    playbackWatchdog = setInterval(() => {
      if (session !== playbackSession) {
        clearPlaybackWatchdog();
        return;
      }
      try {
        const live = window.speechSynthesis;
        if (live?.paused || live?.speaking) live.resume?.();
      } catch {
        /* ignore */
      }
    }, RESUME_WATCHDOG_MS);

    let attempt = 0;
    let started = false;
    let settled = false;
    let retriedWithoutVoice = false;
    const finish = () => {
      if (settled || session !== playbackSession) return;
      settled = true;
      release();
      args.onEnd?.();
    };

    const queue = (useVoice: boolean) => {
      const attemptId = ++attempt;
      let index = 0;
      retainedUtterances = [];

      const speakNext = () => {
        if (settled || session !== playbackSession || attemptId !== attempt) return;
        if (index >= chunks.length) {
          finish();
          return;
        }

        const text = chunks[index]!;
        let utterance: SpeechSynthesisUtterance;
        try {
          utterance = new SpeechSynthesisUtterance(text);
        } catch {
          index += 1;
          speakNext();
          return;
        }

        const voice = useVoice ? resolved.voice : null;
        utterance.lang = voice?.lang || resolved.lang || "en";
        if (voice) {
          try {
            utterance.voice = voice;
          } catch {
            utterance.voice = null;
          }
        }
        utterance.rate = args.rate ?? 1;
        utterance.pitch = args.pitch ?? 1;

        let chunkSettled = false;
        const advance = () => {
          if (chunkSettled || settled || session !== playbackSession || attemptId !== attempt) return;
          chunkSettled = true;
          index += 1;
          speakNext();
        };

        utterance.onstart = () => {
          if (session !== playbackSession || attemptId !== attempt || started) return;
          started = true;
          args.onStart?.();
        };
        utterance.onend = () => advance();
        utterance.onerror = (event) => {
          if (session !== playbackSession || attemptId !== attempt || chunkSettled) return;
          const code = speechErrorCode(event);
          if (isBenignSpeechError(code)) {
            window.setTimeout(() => {
              try {
                if (chunkSettled || settled || session !== playbackSession || attemptId !== attempt) return;
                const live = window.speechSynthesis;
                if (live?.speaking || live?.pending) return;
                advance();
              } catch {
                /* ignore */
              }
            }, 200);
            return;
          }
          if (useVoice && !retriedWithoutVoice && resolved.voice && canRetryWithoutVoice(code)) {
            retriedWithoutVoice = true;
            chunkSettled = true;
            try {
              synth.cancel();
            } catch {
              /* ignore */
            }
            window.setTimeout(() => {
              if (session !== playbackSession) return;
              resumeEngine();
              queue(false);
            }, CANCEL_GAP_MS);
            return;
          }
          args.onError?.(event);
          finish();
        };
        retainedUtterances.push(utterance);
        activeUtterance = utterance;
        try {
          synth.speak(utterance);
        } catch {
          advance();
        }
      };

      speakNext();
    };

    queue(true);
    return session === playbackSession;
  } catch {
    release();
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
