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

/** Polls before treating a stuck speaking/pending flag as a dead queue. */
const STUCK_ENGINE_POLLS = 8;
const STUCK_ENGINE_POLL_MS = 50;

export function isSpeechSynthActive(): boolean {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  try {
    const synth = window.speechSynthesis;
    return Boolean(synth.speaking || synth.pending);
  } catch {
    return false;
  }
}

/**
 * Unpause only. Calling resume() while speech is already playing makes
 * Android Chrome interrupt the current English utterance.
 */
export function resumePausedSpeech(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
  } catch {
    /* ignore */
  }
}

/** One resume after cancel. Some engines stay paused even when `paused` is false. */
export function resumeSpeechEngine(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.resume();
  } catch {
    /* ignore */
  }
}

function clearStuckSpeechEngine(isStillActive: () => boolean): void {
  if (!isStillActive() || typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

/**
 * Chrome often leaves `speaking` true after cancel() or onend, then drops
 * the next speak(). Wait out a real utterance, then cancel that stuck flag
 * once before continuing. Never cancel a newer playback session.
 */
function whenSpeechEngineIdle(onIdle: () => void, isStillActive: () => boolean): void {
  let cleared = false;
  const poll = (attempt: number) => {
    if (!isStillActive()) {
      onIdle();
      return;
    }
    if (!isSpeechSynthActive()) {
      onIdle();
      return;
    }
    if (!cleared && attempt >= STUCK_ENGINE_POLLS) {
      cleared = true;
      clearStuckSpeechEngine(isStillActive);
    }
    if (attempt > STUCK_ENGINE_POLLS + 4) {
      if (isStillActive()) onIdle();
      return;
    }
    window.setTimeout(() => poll(attempt + 1), STUCK_ENGINE_POLL_MS);
  };
  poll(0);
}

/** Wait out the post-cancel gap, then the stuck-engine poll, before the first speak(). */
export function waitUntilSpeechEngineIdle(isStillActive: () => boolean = () => true): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    window.setTimeout(() => {
      if (!isStillActive()) {
        resolve();
        return;
      }
      whenSpeechEngineIdle(resolve, isStillActive);
    }, SPEECH_CANCEL_GAP_MS);
  });
}

/** Wait for chunk gap + idle queue before the next speak() — required on mobile Chrome. */
export function scheduleSpeechAfterGap(
  callback: () => void,
  gapMs = SPEECH_CHUNK_GAP_MS,
  isStillActive: () => boolean = () => true
): void {
  if (typeof window === "undefined") return;
  window.setTimeout(() => {
    if (!isStillActive()) return;
    whenSpeechEngineIdle(() => {
      if (isStillActive()) callback();
    }, isStillActive);
  }, gapMs);
}
