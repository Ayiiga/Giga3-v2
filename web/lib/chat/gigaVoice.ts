/**
 * Shared Giga3 browser TTS layer for chat — voice selection, fallback, playback, cancel.
 * Answer blocks, AfricanVoiceReader, and MessageBubbleActions all delegate here.
 */

import { stripMarkdownForSpeech } from "@/lib/chat/speechText";
import { chunkSpeechText } from "@/lib/speech/chunkSpeechText";
import { logSpeechDiagnostic } from "@/lib/speech/browserSpeechDiagnostics";
import {
  cancelBrowserSpeechSynthesis,
  currentSpeechGeneration,
  isActiveSpeechGeneration,
  onSpeechCancel,
  SPEECH_CANCEL_GAP_MS,
  SPEECH_ONSTART_WATCHDOG_MS,
  SPEECH_RESUME_WATCHDOG_MS,
} from "@/lib/speech/browserSpeechSession";
import {
  getCachedBrowserVoices,
  loadBrowserVoices,
  resolveVoiceByUri,
} from "@/lib/speech/loadBrowserVoices";
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

function resetGigaVoicePlaybackState(): void {
  playbackActive = false;
  activeUtterance = null;
  activeBlockId = null;
  retainedUtterances = [];
  clearPlaybackWatchdog();
}

if (typeof window !== "undefined") {
  onSpeechCancel(resetGigaVoicePlaybackState);
}

export function getActiveSpeechBlockId(): string | null {
  return activeBlockId;
}

export function isGigaVoiceSpeaking(): boolean {
  return playbackActive;
}

export function isGigaVoiceSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopGigaVoice(): void {
  cancelBrowserSpeechSynthesis();
  resetGigaVoicePlaybackState();
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

function resolveLiveVoice(
  resolved: ResolvedGigaVoice,
  useVoice: boolean
): SpeechSynthesisVoice | null {
  if (!useVoice || !resolved.voice?.voiceURI) return null;
  const live = resolveVoiceByUri(getCachedBrowserVoices(), resolved.voice.voiceURI);
  return live ?? resolved.voice;
}

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

  logSpeechDiagnostic("speak_start", {
    session,
    blockId: activeBlockId,
    voiceId: args.voiceId ?? "english-british",
    chunks: chunks.length,
  });

  const release = () => {
    if (!isActiveSpeechGeneration(session)) return;
    resetGigaVoicePlaybackState();
  };

  try {
    const voices = await loadBrowserVoices();
    if (!isActiveSpeechGeneration(session)) return false;
    const resolved = resolveBrowserVoiceForId(voices, args.voiceId);
    logSpeechDiagnostic("voice_resolved", {
      session,
      requested: args.voiceId ?? "english-british",
      lang: resolved.lang,
      voiceName: resolved.voice?.name ?? null,
      voiceUri: resolved.voice?.voiceURI ?? null,
      native: resolved.native,
    });

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

    let started = false;
    let settled = false;
    let index = 0;
    retainedUtterances = [];

    const finish = () => {
      if (settled || !isActiveSpeechGeneration(session)) return;
      settled = true;
      release();
      args.onEnd?.();
    };

    const speakNext = (noVoiceForChunk = false) => {
      if (settled || !isActiveSpeechGeneration(session)) return;
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

      const voice = resolveLiveVoice(resolved, !noVoiceForChunk);
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
      let retriedWithoutVoice = false;
      let onstartWatchdog: ReturnType<typeof setTimeout> | null = null;

      const clearOnstartWatchdog = () => {
        if (onstartWatchdog == null) return;
        clearTimeout(onstartWatchdog);
        onstartWatchdog = null;
      };

      const advance = () => {
        if (chunkSettled || settled || !isActiveSpeechGeneration(session)) return;
        chunkSettled = true;
        clearOnstartWatchdog();
        index += 1;
        speakNext();
      };

      const retryChunkWithoutVoice = () => {
        if (chunkSettled || settled || !isActiveSpeechGeneration(session)) return;
        chunkSettled = true;
        clearOnstartWatchdog();
        try {
          synth.cancel();
        } catch {
          /* ignore */
        }
        window.setTimeout(() => {
          if (!isActiveSpeechGeneration(session)) return;
          resumeEngine();
          speakNext(true);
        }, SPEECH_CANCEL_GAP_MS);
      };

      utterance.onstart = () => {
        if (!isActiveSpeechGeneration(session)) return;
        clearOnstartWatchdog();
        if (!started) {
          started = true;
          logSpeechDiagnostic("speak_onstart", { session, chunk: index, voiceName: voice?.name ?? null });
          args.onStart?.();
        }
      };
      utterance.onend = () => {
        logSpeechDiagnostic("speak_onend", { session, chunk: index });
        advance();
      };
      utterance.onerror = (event) => {
        if (!isActiveSpeechGeneration(session) || chunkSettled) return;
        clearOnstartWatchdog();
        const code = speechErrorCode(event);
        logSpeechDiagnostic("speak_onerror", { session, chunk: index, code });
        if (isBenignSpeechError(code)) {
          window.setTimeout(() => {
            try {
              if (chunkSettled || settled || !isActiveSpeechGeneration(session)) return;
              const live = window.speechSynthesis;
              if (live?.speaking || live?.pending) return;
              advance();
            } catch {
              /* ignore */
            }
          }, 200);
          return;
        }
        if (!noVoiceForChunk && !retriedWithoutVoice && resolved.voice && canRetrySpeechWithoutVoice(code)) {
          retriedWithoutVoice = true;
          logSpeechDiagnostic("speak_retry", { session, reason: "error", code });
          retryChunkWithoutVoice();
          return;
        }
        args.onError?.(event);
        finish();
      };

      retainedUtterances.push(utterance);
      activeUtterance = utterance;
      logSpeechDiagnostic("speak_chunk", {
        session,
        chunk: index,
        chars: text.length,
        lang: utterance.lang,
        voiceName: voice?.name ?? null,
      });

      onstartWatchdog = window.setTimeout(() => {
        if (started || chunkSettled || settled || !isActiveSpeechGeneration(session)) return;
        logSpeechDiagnostic("speak_retry", { session, reason: "onstart_watchdog", chunk: index });
        if (!noVoiceForChunk && !retriedWithoutVoice) {
          retriedWithoutVoice = true;
          retryChunkWithoutVoice();
          return;
        }
        advance();
      }, SPEECH_ONSTART_WATCHDOG_MS);

      try {
        synth.speak(utterance);
      } catch {
        clearOnstartWatchdog();
        advance();
      }
    };

    speakNext();
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
