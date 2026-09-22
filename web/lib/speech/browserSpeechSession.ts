/**
 * One cancel generation for every browser TTS entry point (chat + GigaLearn).
 * Stopping any speech cancels all retained utterances and resets module state.
 */

let speechGeneration = 0;
const cancelListeners = new Set<() => void>();

export function onSpeechCancel(listener: () => void): () => void {
  cancelListeners.add(listener);
  return () => cancelListeners.delete(listener);
}

export function nextSpeechGeneration(): number {
  speechGeneration += 1;
  return speechGeneration;
}

export function currentSpeechGeneration(): number {
  return speechGeneration;
}

export function isActiveSpeechGeneration(generation: number): boolean {
  return generation === speechGeneration;
}

export function cancelBrowserSpeechSynthesis(): number {
  speechGeneration += 1;
  for (const listener of cancelListeners) {
    try {
      listener();
    } catch {
      /* ignore */
    }
  }
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return speechGeneration;
  }
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
  return speechGeneration;
}

/** Gap after cancel() before the next speak() — Chrome drops utterances queued too soon. */
export const SPEECH_CANCEL_GAP_MS = 120;

/** Gap between sequential chunks/parts — Android Chrome drops speak() fired synchronously from onend. */
export const SPEECH_CHUNK_GAP_MS = 120;

export const SPEECH_RESUME_WATCHDOG_MS = 2500;

/** If onstart never fires, retry the chunk once without a pinned voice. */
export const SPEECH_ONSTART_WATCHDOG_MS = 2200;

export function isSpeechSynthActive(): boolean {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  try {
    const synth = window.speechSynthesis;
    return synth.speaking || synth.pending;
  } catch {
    return false;
  }
}

/** Wait for cancel gap + idle queue before the next speak() — required on mobile Chrome. */
export function scheduleSpeechAfterGap(callback: () => void, gapMs = SPEECH_CHUNK_GAP_MS): void {
  if (typeof window === "undefined") return;
  window.setTimeout(() => {
    const waitForIdle = (attempts = 0) => {
      if (attempts > 24) {
        callback();
        return;
      }
      if (isSpeechSynthActive()) {
        window.setTimeout(() => waitForIdle(attempts + 1), 50);
        return;
      }
      callback();
    };
    waitForIdle();
  }, gapMs);
}
