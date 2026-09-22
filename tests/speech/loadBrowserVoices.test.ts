import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function mockVoice(name: string, lang: string): SpeechSynthesisVoice {
  return { name, lang, voiceURI: `${name}-${lang}`, localService: true } as SpeechSynthesisVoice;
}

function installVoiceLoaderMock(options?: { delayVoicesMs?: number }) {
  let voices: SpeechSynthesisVoice[] = options?.delayVoicesMs
    ? []
    : [mockVoice("English US", "en-US")];
  const listeners = new Map<string, Set<() => void>>();

  const synth = {
    getVoices: () => voices,
    addEventListener: vi.fn((type: string, handler: () => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(handler);
    }),
    removeEventListener: vi.fn((type: string, handler: () => void) => {
      listeners.get(type)?.delete(handler);
    }),
    _emitVoicesChanged: () => {
      for (const handler of listeners.get("voiceschanged") ?? []) handler();
    },
    _setVoices: (next: SpeechSynthesisVoice[]) => {
      voices = next;
    },
  };

  vi.stubGlobal("window", {
    speechSynthesis: synth,
    setTimeout: (fn: () => void, ms?: number) => globalThis.setTimeout(fn, ms ?? 0),
    clearTimeout: globalThis.clearTimeout,
  });

  if (options?.delayVoicesMs) {
    const delayed = [mockVoice("Hausa Nigeria", "ha-NG")];
    globalThis.setTimeout(() => {
      voices = delayed;
      synth._emitVoicesChanged();
    }, options.delayVoicesMs);
  }

  return { synth };
}

describe("loadBrowserVoices", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("returns cached voices immediately when getVoices is populated", async () => {
    installVoiceLoaderMock();
    const { loadBrowserVoices, getCachedBrowserVoices } = await import(
      "../../web/lib/speech/loadBrowserVoices"
    );

    const voices = await loadBrowserVoices();
    expect(voices).toHaveLength(1);
    expect(voices[0]?.name).toBe("English US");
    expect(getCachedBrowserVoices()[0]?.name).toBe("English US");
  });

  it("waits for voiceschanged when getVoices is initially empty", async () => {
    vi.useFakeTimers();
    installVoiceLoaderMock({ delayVoicesMs: 150 });
    const { loadBrowserVoices } = await import("../../web/lib/speech/loadBrowserVoices");

    const pending = loadBrowserVoices();
    await vi.advanceTimersByTimeAsync(300);
    const voices = await pending;
    expect(voices).toHaveLength(1);
    expect(voices[0]?.lang).toBe("ha-NG");
  });

  it("dedupes concurrent loadBrowserVoices calls", async () => {
    vi.useFakeTimers();
    const { synth } = installVoiceLoaderMock({ delayVoicesMs: 100 });
    const { loadBrowserVoices } = await import("../../web/lib/speech/loadBrowserVoices");

    const first = loadBrowserVoices();
    const second = loadBrowserVoices();
    await vi.advanceTimersByTimeAsync(250);
    const [a, b] = await Promise.all([first, second]);
    expect(a).toBe(b);
    expect(synth.addEventListener).toHaveBeenCalledWith("voiceschanged", expect.any(Function));
  });

  it("resolveVoiceByUri picks a voice from the latest list", async () => {
    installVoiceLoaderMock();
    const { loadBrowserVoices, resolveVoiceByUri } = await import(
      "../../web/lib/speech/loadBrowserVoices"
    );
    const voices = await loadBrowserVoices();
    const match = resolveVoiceByUri(voices, "English US-en-US");
    expect(match?.name).toBe("English US");
  });
});
