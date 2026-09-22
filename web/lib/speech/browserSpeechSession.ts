/**
 * One cancel generation for every browser TTS entry point (chat + GigaLearn).
 * Stopping chat playback also stops pronunciation, and the other way around.
 */

let speechGeneration = 0;

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
