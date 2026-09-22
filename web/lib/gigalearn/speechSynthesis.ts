import type { GigaLearnVoice } from "@/lib/gigalearn/concreteObjects";
import type { PronunciationPart } from "@/lib/gigalearn/pronunciation";
import { GIGA_VOICE_LANG } from "@/lib/speech/gigaVoiceProfiles";
import {
  cancelBrowserSpeechSynthesis,
  currentSpeechGeneration,
  isActiveSpeechGeneration,
  SPEECH_CANCEL_GAP_MS,
  SPEECH_RESUME_WATCHDOG_MS,
} from "@/lib/speech/browserSpeechSession";
import { loadBrowserVoices } from "@/lib/speech/loadBrowserVoices";
import {
  isBenignSpeechError,
  speechErrorCode,
} from "@/lib/speech/speechErrorHandling";
import {
  matchBrowserVoice,
  type MatchedBrowserVoice,
  type VoiceLangConfig,
} from "@/lib/speech/matchBrowserVoice";

const LEARN_VOICE_IDS = [
  "english",
  "abena-twi",
  "musa-hausa",
  "naa-ga",
  "kofi-ewe",
  "ade-yoruba",
  "zawadi-swahili",
] as const;

/** GigaLearn voice ids reuse the shared chat BCP-47 map (no duplicate tags). */
export const GIGALEARN_VOICE_LANG: Record<string, VoiceLangConfig> = Object.fromEntries(
  LEARN_VOICE_IDS.map((id) => [
    id,
    GIGA_VOICE_LANG[id] ?? GIGA_VOICE_LANG["english-british"],
  ])
);

export type ResolvedSpeechVoice = MatchedBrowserVoice;

/** Pure resolver — pick the best installed browser voice for a GigaLearn profile. */
export function resolveBrowserVoiceForProfile(
  voices: SpeechSynthesisVoice[],
  voiceId?: string
): ResolvedSpeechVoice {
  const config = GIGALEARN_VOICE_LANG[voiceId || "english"] ?? GIGALEARN_VOICE_LANG.english;
  return matchBrowserVoice(voices, config);
}

export function resolvePronunciationParts(
  voices: SpeechSynthesisVoice[],
  parts: PronunciationPart[]
): Array<{ text: string; lang: string; voice: SpeechSynthesisVoice | null }> {
  const spoken: Array<{ text: string; lang: string; voice: SpeechSynthesisVoice | null }> = [];

  for (const part of parts) {
    const config = GIGALEARN_VOICE_LANG[part.voiceId] ?? GIGALEARN_VOICE_LANG.english;
    const match = matchBrowserVoice(voices, config);
    if (part.requireNative && !match.native) {
      const fallback = part.phoneticFallback?.trim();
      if (!fallback) continue;
      const english = matchBrowserVoice(voices, GIGALEARN_VOICE_LANG.english);
      spoken.push({ text: fallback, lang: english.lang, voice: english.voice });
      continue;
    }
    const text = part.text.trim();
    if (!text) continue;
    spoken.push({ text, lang: match.lang, voice: match.voice });
  }

  return spoken;
}

/** Keep every utterance alive until playback ends. Chrome collects unreferenced ones. */
let retainedLearnUtterances: SpeechSynthesisUtterance[] = [];
let learnPlaybackWatchdog: ReturnType<typeof setInterval> | null = null;

function clearLearnPlaybackWatchdog(): void {
  if (learnPlaybackWatchdog == null) return;
  clearInterval(learnPlaybackWatchdog);
  learnPlaybackWatchdog = null;
}

export function stopGigaLearnVoice(): void {
  cancelBrowserSpeechSynthesis();
  retainedLearnUtterances = [];
  clearLearnPlaybackWatchdog();
}

function queueUtterances(
  parts: Array<{ text: string; lang: string; voice: SpeechSynthesisVoice | null }>,
  rate: number,
  pitch: number,
  session: number,
  onEnd?: () => void
): void {
  retainedLearnUtterances = [];

  window.setTimeout(() => {
    if (!isActiveSpeechGeneration(session)) return;

    const synth = window.speechSynthesis;
    try {
      synth.resume();
    } catch {
      /* ignore */
    }

    clearLearnPlaybackWatchdog();
    learnPlaybackWatchdog = setInterval(() => {
      if (!isActiveSpeechGeneration(session)) {
        clearLearnPlaybackWatchdog();
        return;
      }
      try {
        if (synth.paused || synth.speaking) synth.resume?.();
      } catch {
        /* ignore */
      }
    }, SPEECH_RESUME_WATCHDOG_MS);

    let index = 0;

    const finish = () => {
      if (!isActiveSpeechGeneration(session)) return;
      retainedLearnUtterances = [];
      clearLearnPlaybackWatchdog();
      onEnd?.();
    };

    const speakNext = () => {
      if (!isActiveSpeechGeneration(session)) return;
      if (index >= parts.length) {
        finish();
        return;
      }

      const part = parts[index]!;
      let utter: SpeechSynthesisUtterance;
      try {
        utter = new SpeechSynthesisUtterance(part.text.slice(0, 2000));
      } catch {
        index += 1;
        speakNext();
        return;
      }

      utter.lang = part.voice?.lang || part.lang || "en";
      if (part.voice) {
        try {
          utter.voice = part.voice;
        } catch {
          utter.voice = null;
        }
      }
      utter.rate = rate;
      utter.pitch = pitch;

      let settled = false;
      const advance = () => {
        if (settled || !isActiveSpeechGeneration(session)) return;
        settled = true;
        index += 1;
        speakNext();
      };

      utter.onend = advance;
      utter.onerror = (event) => {
        if (settled || !isActiveSpeechGeneration(session)) return;
        const code = speechErrorCode(event);
        if (isBenignSpeechError(code)) {
          window.setTimeout(() => {
            try {
              if (settled || !isActiveSpeechGeneration(session)) return;
              const live = window.speechSynthesis;
              if (live?.speaking || live?.pending) return;
              advance();
            } catch {
              /* ignore */
            }
          }, 200);
          return;
        }
        advance();
      };

      retainedLearnUtterances.push(utter);
      try {
        synth.speak(utter);
      } catch {
        advance();
      }
    };

    speakNext();
  }, SPEECH_CANCEL_GAP_MS);
}

/** Speak one line with language/voice selection from a GigaLearn profile. */
export async function speakWithGigaLearnVoice(args: SpeakWithGigaLearnVoiceArgs): Promise<boolean> {
  return speakPronunciationSequence(
    [{ text: args.text, voiceId: args.voiceId || "english" }],
    { rate: args.rate, pitch: args.pitch, onEnd: args.onEnd }
  );
}

export type SpeakWithGigaLearnVoiceArgs = {
  text: string;
  voiceId?: string;
  rate?: number;
  pitch?: number;
  onEnd?: () => void;
};

/** Speak English first, then a native African voice or an English phonetic guide. */
export async function speakPronunciationSequence(
  parts: PronunciationPart[],
  options?: { rate?: number; pitch?: number; onEnd?: () => void }
): Promise<boolean> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const queued = parts.some((part) => part.text.trim() || part.phoneticFallback?.trim());
  if (!queued) return false;

  stopGigaLearnVoice();
  const session = currentSpeechGeneration();

  try {
    const voices = await loadBrowserVoices();
    if (!isActiveSpeechGeneration(session)) return false;
    const resolved = resolvePronunciationParts(voices, parts);
    if (resolved.length === 0) return false;
    queueUtterances(resolved, options?.rate ?? 0.9, options?.pitch ?? 1.05, session, options?.onEnd);
    return true;
  } catch {
    return false;
  }
}

export function voiceProfileLanguageLabel(voice: GigaLearnVoice | undefined): string {
  if (!voice) return "English";
  return voice.language.split("·")[0]?.trim() || voice.language;
}
