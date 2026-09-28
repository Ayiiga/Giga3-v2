import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("browserSpeechSession scheduling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("scheduleSpeechAfterGap waits for chunk gap and idle queue", async () => {
    let speaking = true;
    vi.stubGlobal("window", {
      speechSynthesis: {
        get speaking() {
          return speaking;
        },
        get pending() {
          return false;
        },
      },
      setTimeout: (fn: () => void, ms?: number) => globalThis.setTimeout(fn, ms ?? 0),
      clearTimeout: globalThis.clearTimeout,
    });

    const { scheduleSpeechAfterGap, SPEECH_CHUNK_GAP_MS } = await import(
      "../../web/lib/speech/browserSpeechSession"
    );
    const callback = vi.fn();
    scheduleSpeechAfterGap(callback);

    await vi.advanceTimersByTimeAsync(SPEECH_CHUNK_GAP_MS);
    expect(callback).not.toHaveBeenCalled();

    speaking = false;
    await vi.advanceTimersByTimeAsync(60);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("clears a stuck speaking flag before the next English chunk", async () => {
    let speaking = true;
    const cancel = vi.fn(() => {
      speaking = false;
    });
    vi.stubGlobal("window", {
      speechSynthesis: {
        get speaking() {
          return speaking;
        },
        get pending() {
          return false;
        },
        cancel,
      },
      setTimeout: (fn: () => void, ms?: number) => globalThis.setTimeout(fn, ms ?? 0),
      clearTimeout: globalThis.clearTimeout,
    });

    const { scheduleSpeechAfterGap, SPEECH_CHUNK_GAP_MS } = await import(
      "../../web/lib/speech/browserSpeechSession"
    );
    const callback = vi.fn();
    scheduleSpeechAfterGap(callback);

    await vi.advanceTimersByTimeAsync(SPEECH_CHUNK_GAP_MS + 600);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("does not cancel speech that belongs to a newer playback", async () => {
    let speaking = true;
    let stillActive = true;
    const cancel = vi.fn();
    vi.stubGlobal("window", {
      speechSynthesis: {
        get speaking() {
          return speaking;
        },
        pending: false,
        cancel,
      },
      setTimeout: (fn: () => void, ms?: number) => globalThis.setTimeout(fn, ms ?? 0),
      clearTimeout: globalThis.clearTimeout,
    });

    const { scheduleSpeechAfterGap, SPEECH_CHUNK_GAP_MS } = await import(
      "../../web/lib/speech/browserSpeechSession"
    );
    const callback = vi.fn();
    scheduleSpeechAfterGap(callback, SPEECH_CHUNK_GAP_MS, () => stillActive);
    stillActive = false;
    await vi.advanceTimersByTimeAsync(SPEECH_CHUNK_GAP_MS + 600);
    expect(cancel).not.toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
  });
});
