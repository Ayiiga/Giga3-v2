/**
 * Shared Giga3 browser TTS layer for chat — voice selection, fallback, playback, cancel.
 * Answer blocks, AfricanVoiceReader, and MessageBubbleActions all delegate here.
 */

import { stripMarkdownForSpeech } from "@/lib/chat/speechText";
import { chunkSpeechText } from "@/lib/speech/chunkSpeechText";
import {
  cancelBrowserSpeechSynthesis,
  currentSpeechGeneration,
  isActiveSpeechGeneration,
  SPEECH_CANCEL_GAP_MS,
  SPEECH_RESUME_WATCHDOG_MS,
} from "@/lib/speech/browserSpeechSession";
import { loadBrowserVoices } from "@/lib/speech/loadBrowserVoices";
import {
  GIGA_CHAT_VOICES,
  GIGA_VOICE_LANG,
  type GigaVoiceProfile,
} from "@/lib/speech/gigaVoiceProfiles";
import {
  canRetrySpeechWithoutVoice,
  isBenignSpeechError,
  speechErrorCode,
} from "@/lib/speech/speechErrorHandling";
import {
  matchBrowserVoice,
  type VoiceLangConfig,
} from "@/lib/speech/matchBrowserVoice";

export type { GigaVoiceProfile };
export { GIGA_CHAT_VOICES, GIGA_VOICE_LANG };

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

export { loadBrowserVoices };

let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeBlockId: string | null = null;
let playbackActive = false;
/** Chrome drops utterances that are not still referenced from JS. */
let retainedUtterances: SpeechSynthesisUtterance[] = [];
let playbackWatchdog: ReturnType<typeof setInterval> | null = null;

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
  cancelBrowserSpeechSynthesis();
  playbackActive = false;
  activeUtterance = null;
  activeBlockId = null;
  retainedUtterances = [];
  clearPlaybackWatchdog();
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

/** Speak plain/markdown text with the selected Giga3 voice profile. */
export async function speakGigaVoice(args: SpeakGigaVoiceArgs & { blockId?: string }): Promise<boolean> {
  if (!isGigaVoiceSupported()) return false;
  const plain = stripMarkdownForSpeech(args.text);
  const chunks = chunkSpeechText(plain, 200);
  if (chunks.length === 0) return false;

  stopGigaVoice();
  const session = currentSpeechGeneration();
  playbackActive = true;
  activeBlockId = args.blockId ?? null;

  const release = () => {
    if (!isActiveSpeechGeneration(session)) return;
    playbackActive = false;
    activeUtterance = null;
    activeBlockId = null;
    retainedUtterances = [];
    clearPlaybackWatchdog();
  };

  try {
    const voices = await loadBrowserVoices();
    if (!isActiveSpeechGeneration(session)) return false;
    const resolved = resolveBrowserVoiceForId(voices, args.voiceId);

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, SPEECH_CANCEL_GAP_MS);
    });
    if (!isActiveSpeechGeneration(session)) return false;

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
      if (!isActiveSpeechGeneration(session)) {
        clearPlaybackWatchdog();
        return;
      }
      try {
        const live = window.speechSynthesis;
        if (live?.paused || live?.speaking) live.resume?.();
      } catch {
        /* ignore */
      }
    }, SPEECH_RESUME_WATCHDOG_MS);

    let attempt = 0;
    let started = false;
    let settled = false;
    let retriedWithoutVoice = false;
    const finish = () => {
      if (settled || !isActiveSpeechGeneration(session)) return;
      settled = true;
      release();
      args.onEnd?.();
    };

    const queue = (useVoice: boolean) => {
      const attemptId = ++attempt;
      let index = 0;
      retainedUtterances = [];

      const speakNext = () => {
        if (settled || !isActiveSpeechGeneration(session) || attemptId !== attempt) return;
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
          if (chunkSettled || settled || !isActiveSpeechGeneration(session) || attemptId !== attempt) return;
          chunkSettled = true;
          index += 1;
          speakNext();
        };

        utterance.onstart = () => {
          if (!isActiveSpeechGeneration(session) || attemptId !== attempt || started) return;
          started = true;
          args.onStart?.();
        };
        utterance.onend = () => advance();
        utterance.onerror = (event) => {
          if (!isActiveSpeechGeneration(session) || attemptId !== attempt || chunkSettled) return;
          const code = speechErrorCode(event);
          if (isBenignSpeechError(code)) {
            window.setTimeout(() => {
              try {
                if (chunkSettled || settled || !isActiveSpeechGeneration(session) || attemptId !== attempt) return;
                const live = window.speechSynthesis;
                if (live?.speaking || live?.pending) return;
                advance();
              } catch {
                /* ignore */
              }
            }, 200);
            return;
          }
          if (useVoice && !retriedWithoutVoice && resolved.voice && canRetrySpeechWithoutVoice(code)) {
            retriedWithoutVoice = true;
            chunkSettled = true;
            try {
              synth.cancel();
            } catch {
              /* ignore */
            }
            window.setTimeout(() => {
              if (!isActiveSpeechGeneration(session)) return;
              resumeEngine();
              queue(false);
            }, SPEECH_CANCEL_GAP_MS);
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
    return isActiveSpeechGeneration(session);
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
