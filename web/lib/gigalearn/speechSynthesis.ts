import type { GigaLearnVoice } from "@/lib/gigalearn/concreteObjects";
import type { PronunciationPart } from "@/lib/gigalearn/pronunciation";
import {
  matchBrowserVoice,
  type MatchedBrowserVoice,
  type VoiceLangConfig,
} from "@/lib/speech/matchBrowserVoice";

/**
 * BCP-47 tags for GigaLearn voices.
 * African profiles do not list English as a "match" — English is only
 * the stand-in when no native voice is installed, and it keeps its own lang tag.
 */
export const GIGALEARN_VOICE_LANG: Record<string, VoiceLangConfig> = {
  english: { primary: "en-GB", fallbacks: ["en-US", "en-GH", "en"] },
  "abena-twi": { primary: "ak-GH", fallbacks: ["ak", "tw-GH", "tw"] },
  "musa-hausa": { primary: "ha-NG", fallbacks: ["ha", "ha-GH"] },
  "naa-ga": { primary: "gaa-GH", fallbacks: ["gaa"] },
  "kofi-ewe": { primary: "ee-GH", fallbacks: ["ee"] },
  "ade-yoruba": { primary: "yo-NG", fallbacks: ["yo", "yo-GH"] },
  "zawadi-swahili": { primary: "sw-KE", fallbacks: ["sw", "sw-TZ"] },
};

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

export type SpeakWithGigaLearnVoiceArgs = {
  text: string;
  voiceId?: string;
  rate?: number;
  pitch?: number;
  onEnd?: () => void;
};

function queueUtterances(
  parts: Array<{ text: string; lang: string; voice: SpeechSynthesisVoice | null }>,
  rate: number,
  pitch: number,
  onEnd?: () => void
): void {
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }

  // Chrome drops utterances spoken in the same turn as cancel().
  window.setTimeout(() => {
    try {
      window.speechSynthesis.resume();
    } catch {
      /* ignore */
    }
    let remaining = parts.length;
    if (remaining === 0) {
      onEnd?.();
      return;
    }
    const done = () => {
      remaining -= 1;
      if (remaining <= 0) onEnd?.();
    };
    for (const part of parts) {
      let utter: SpeechSynthesisUtterance;
      try {
        utter = new SpeechSynthesisUtterance(part.text.slice(0, 2000));
      } catch {
        done();
        continue;
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
        if (settled) return;
        settled = true;
        done();
      };
      utter.onend = advance;
      utter.onerror = (event) => {
        const code = (event as SpeechSynthesisErrorEvent | undefined)?.error;
        if (code === "interrupted" || code === "canceled" || code === "cancelled") {
          window.setTimeout(() => {
            try {
              if (settled) return;
              const live = window.speechSynthesis;
              if (!live?.speaking && !live?.pending) advance();
            } catch {
              /* ignore */
            }
          }, 200);
          return;
        }
        advance();
      };
      try {
        window.speechSynthesis.speak(utter);
      } catch {
        advance();
      }
    }
  }, 40);
}

/** Speak one line with language/voice selection from a GigaLearn profile. */
export async function speakWithGigaLearnVoice(args: SpeakWithGigaLearnVoiceArgs): Promise<boolean> {
  return speakPronunciationSequence(
    [{ text: args.text, voiceId: args.voiceId || "english" }],
    { rate: args.rate, pitch: args.pitch, onEnd: args.onEnd }
  );
}

/** Speak English first, then a native African voice or an English phonetic guide. */
export async function speakPronunciationSequence(
  parts: PronunciationPart[],
  options?: { rate?: number; pitch?: number; onEnd?: () => void }
): Promise<boolean> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const queued = parts.some((part) => part.text.trim() || part.phoneticFallback?.trim());
  if (!queued) return false;

  try {
    const voices = await loadBrowserVoices();
    const resolved = resolvePronunciationParts(voices, parts);
    if (resolved.length === 0) return false;
    queueUtterances(resolved, options?.rate ?? 0.9, options?.pitch ?? 1.05, options?.onEnd);
    return true;
  } catch {
    return false;
  }
}

export function voiceProfileLanguageLabel(voice: GigaLearnVoice | undefined): string {
  if (!voice) return "English";
  return voice.language.split("·")[0]?.trim() || voice.language;
}
