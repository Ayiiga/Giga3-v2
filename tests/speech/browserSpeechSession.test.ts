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
});
