import { logSpeechDiagnostic } from "@/lib/speech/browserSpeechDiagnostics";

/** Android Chrome often needs >700ms and a prior getVoices() call before voices populate. */
const VOICES_LOAD_TIMEOUT_MS = 2200;

let cachedVoices: SpeechSynthesisVoice[] = [];
let inflightLoad: Promise<SpeechSynthesisVoice[]> | null = null;
let listenerAttached = false;

function readVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

function syncVoiceCache(): SpeechSynthesisVoice[] {
  const voices = readVoices();
  if (voices.length > 0) {
    cachedVoices = voices;
    logSpeechDiagnostic("voices_loaded", { count: voices.length, cached: true });
  }
  return cachedVoices;
}

function attachGlobalVoiceListener(): void {
  if (listenerAttached || typeof window === "undefined" || !window.speechSynthesis) return;
  listenerAttached = true;
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    syncVoiceCache();
  });
}

/** Prime the voice list on first user interaction (Chrome/Android requirement). */
export function warmUpBrowserVoices(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  attachGlobalVoiceListener();
  const count = syncVoiceCache().length;
  try {
    window.speechSynthesis.getVoices();
  } catch {
    /* ignore */
  }
  logSpeechDiagnostic("voices_warmup", { count });
}

export function getCachedBrowserVoices(): SpeechSynthesisVoice[] {
  attachGlobalVoiceListener();
  return cachedVoices.length > 0 ? cachedVoices : syncVoiceCache();
}

/** Resolve a voice object by URI against the latest voice list (avoids stale references). */
export function resolveVoiceByUri(
  voices: SpeechSynthesisVoice[],
  voiceURI: string | null | undefined
): SpeechSynthesisVoice | null {
  if (!voiceURI) return null;
  return voices.find((voice) => voice.voiceURI === voiceURI) ?? null;
}

/**
 * Load browser voices with cache, deduped in-flight wait, and voiceschanged support.
 * Re-reads before resolving so Android late population is picked up.
 */
export function loadBrowserVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve([]);
  }

  attachGlobalVoiceListener();
  const immediate = syncVoiceCache();
  if (immediate.length > 0) return Promise.resolve(immediate);

  if (inflightLoad) return inflightLoad;

  inflightLoad = new Promise((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      inflightLoad = null;
      const voices = syncVoiceCache();
      logSpeechDiagnostic("voices_loaded", { count: voices.length, waited: true });
      resolve(voices);
    };

    const onChange = () => {
      if (syncVoiceCache().length > 0) {
        window.speechSynthesis.removeEventListener("voiceschanged", onChange);
        finish();
      }
    };

    window.speechSynthesis.addEventListener("voiceschanged", onChange);
    try {
      window.speechSynthesis.getVoices();
    } catch {
      /* ignore */
    }

    window.setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", onChange);
      finish();
    }, VOICES_LOAD_TIMEOUT_MS);
  });

  return inflightLoad;
}
