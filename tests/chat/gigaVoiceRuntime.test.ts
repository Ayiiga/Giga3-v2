import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type TtsLogEntry = { type: "cancel" | "speak"; text?: string; lang?: string; voiceName?: string };

function mockVoice(name: string, lang: string): SpeechSynthesisVoice {
  return { name, lang, voiceURI: `${name}-${lang}`, localService: true } as SpeechSynthesisVoice;
}

function installSpeechMock(options?: { voices?: SpeechSynthesisVoice[]; delayVoicesMs?: number }) {
  const log: TtsLogEntry[] = [];
  let speaking = false;
  let voices = options?.voices ?? [
    mockVoice("English US", "en-US"),
    mockVoice("Hausa Nigeria", "ha-NG"),
  ];
  const listeners = new Map<string, Set<() => void>>();

  const synth = {
    get speaking() {
      return speaking;
    },
    getVoices: () => voices,
    cancel: vi.fn(() => {
      log.push({ type: "cancel" });
      speaking = false;
    }),
    speak: vi.fn((utterance: SpeechSynthesisUtterance) => {
      log.push({
        type: "speak",
        text: utterance.text,
        lang: utterance.lang,
        voiceName: utterance.voice?.name,
      });
      speaking = true;
      queueMicrotask(() => utterance.onstart?.(new Event("start") as SpeechSynthesisEvent));
    }),
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
    _finishSpeaking: (utterance: SpeechSynthesisUtterance) => {
      speaking = false;
      utterance.onend?.(new Event("end") as SpeechSynthesisEvent);
    },
  };

  class MockUtterance {
    text: string;
    lang = "";
    voice: SpeechSynthesisVoice | null = null;
    rate = 1;
    pitch = 1;
    onstart: ((event: SpeechSynthesisEvent) => void) | null = null;
    onend: ((event: SpeechSynthesisEvent) => void) | null = null;
    onerror: ((event: SpeechSynthesisErrorEvent) => void) | null = null;

    constructor(text: string) {
      this.text = text;
    }
  }

  vi.stubGlobal("SpeechSynthesisUtterance", MockUtterance);
  vi.stubGlobal("window", {
    speechSynthesis: synth,
    setTimeout: (fn: () => void, ms?: number) => globalThis.setTimeout(fn, ms ?? 0),
    clearTimeout: globalThis.clearTimeout,
  });

  if (options?.delayVoicesMs) {
    const initial = voices;
    voices = [];
    globalThis.setTimeout(() => {
      voices = initial;
      synth._emitVoicesChanged();
    }, options.delayVoicesMs);
  }

  return { log, synth };
}

describe("gigaVoice runtime (mocked SpeechSynthesis)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("cancel() then speak() on each new playback", async () => {
    const { log } = installSpeechMock();
    const { speakGigaVoice, stopGigaVoice } = await import("../../web/lib/chat/gigaVoice");

    await speakGigaVoice({ text: "Block one text.", voiceId: "musa-hausa", blockId: "b1" });
    expect(log.map((e) => e.type)).toEqual(["cancel", "speak"]);
    expect(log[1]?.text).toBe("Block one text.");
    expect(log[1]?.voiceName).toBe("Hausa Nigeria");

    stopGigaVoice();
    expect(log.at(-1)?.type).toBe("cancel");

    log.length = 0;
    await speakGigaVoice({ text: "Block two text.", voiceId: "musa-hausa", blockId: "b2" });
    expect(log.map((e) => e.type)).toEqual(["cancel", "speak"]);
    expect(log[1]?.text).toBe("Block two text.");
  });

  it("toggleGigaVoiceBlock cancels block1 when block2 starts", async () => {
    const { log, synth } = installSpeechMock();
    const { toggleGigaVoiceBlock, getActiveSpeechBlockId } = await import(
      "../../web/lib/chat/gigaVoice"
    );

    await toggleGigaVoiceBlock({
      blockId: "intro-0",
      text: "Introduction paragraph.",
      voiceId: "abena-twi",
    });
    expect(getActiveSpeechBlockId()).toBe("intro-0");
    expect(log.filter((e) => e.type === "speak")).toHaveLength(1);

    log.length = 0;
    await toggleGigaVoiceBlock({
      blockId: "main-1",
      text: "Main message paragraph.",
      voiceId: "abena-twi",
    });
    expect(log.map((e) => e.type)).toEqual(["cancel", "speak"]);
    expect(getActiveSpeechBlockId()).toBe("main-1");
    expect(log[1]?.text).toBe("Main message paragraph.");

    synth._finishSpeaking({ onend: null } as SpeechSynthesisUtterance);
  });

  it("toggleGigaVoiceBlock stops when the same block is toggled again", async () => {
    const { log } = installSpeechMock();
    const { toggleGigaVoiceBlock, isGigaVoiceSpeaking } = await import(
      "../../web/lib/chat/gigaVoice"
    );

    await toggleGigaVoiceBlock({
      blockId: "same-block",
      text: "Repeatable block.",
      voiceId: "abena-twi",
    });
    expect(isGigaVoiceSpeaking()).toBe(true);

    log.length = 0;
    const stopped = await toggleGigaVoiceBlock({
      blockId: "same-block",
      text: "Repeatable block.",
      voiceId: "abena-twi",
    });
    expect(stopped).toBe(false);
    expect(log.map((e) => e.type)).toEqual(["cancel"]);
  });

  it("resolves voice B when voiceId changes between speak calls", async () => {
    const { log } = installSpeechMock({
      voices: [
        mockVoice("English US", "en-US"),
        mockVoice("Hausa Nigeria", "ha-NG"),
        mockVoice("Swahili Kenya", "sw-KE"),
      ],
    });
    const { speakGigaVoice } = await import("../../web/lib/chat/gigaVoice");

    await speakGigaVoice({ text: "Voice A", voiceId: "musa-hausa", blockId: "a" });
    expect(log.at(-1)?.voiceName).toBe("Hausa Nigeria");

    await speakGigaVoice({ text: "Voice B", voiceId: "zawadi-swahili", blockId: "b" });
    expect(log.at(-1)?.voiceName).toBe("Swahili Kenya");
  });

  it("falls back to English when African voice is unavailable", async () => {
    const { log } = installSpeechMock({ voices: [mockVoice("English US", "en-US")] });
    const { speakGigaVoice } = await import("../../web/lib/chat/gigaVoice");

    await speakGigaVoice({ text: "Fallback path.", voiceId: "abena-twi", blockId: "fb" });
    expect(log.at(-1)?.voiceName).toBe("English US");
    expect(log.at(-1)?.lang).toBe("en-GH");
  });

  it("waits for voiceschanged when getVoices() is initially empty", async () => {
    vi.useFakeTimers();
    const { synth } = installSpeechMock({ delayVoicesMs: 100 });
    const { speakGigaVoice } = await import("../../web/lib/chat/gigaVoice");

    const pending = speakGigaVoice({ text: "Delayed voices.", voiceId: "musa-hausa" });
    await vi.advanceTimersByTimeAsync(250);
    await pending;
    expect(synth.speak).toHaveBeenCalled();
    expect(synth.addEventListener).toHaveBeenCalledWith("voiceschanged", expect.any(Function));
    expect(synth.removeEventListener).toHaveBeenCalled();
  });

  it("does not crash when no voices are installed", async () => {
    installSpeechMock({ voices: [] });
    const { speakGigaVoice } = await import("../../web/lib/chat/gigaVoice");

    const ok = await speakGigaVoice({ text: "No voices installed.", voiceId: "abena-twi" });
    expect(ok).toBe(true);
  });

  it("strips markdown before speaking", async () => {
    const { log } = installSpeechMock();
    const { speakGigaVoice } = await import("../../web/lib/chat/gigaVoice");

    await speakGigaVoice({
      text: "## Heading\n\n**Bold** text with `code`.",
      voiceId: "abena-twi",
    });
    expect(log.at(-1)?.text).not.toContain("##");
    expect(log.at(-1)?.text).toContain("Bold");
  });
});
