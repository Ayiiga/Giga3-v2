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
export const SPEECH_CANCEL_GAP_MS = 60;

export const SPEECH_RESUME_WATCHDOG_MS = 2500;

/** If onstart never fires, retry the chunk once without a pinned voice. */
export const SPEECH_ONSTART_WATCHDOG_MS = 2200;
