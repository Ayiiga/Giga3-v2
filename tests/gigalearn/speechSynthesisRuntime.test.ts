import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type TtsLogEntry = { type: "cancel" | "speak"; text?: string; lang?: string; voiceName?: string };

function mockVoice(name: string, lang: string): SpeechSynthesisVoice {
  return { name, lang, voiceURI: `${name}-${lang}`, localService: true } as SpeechSynthesisVoice;
}

function installSpeechMock(options?: { voices?: SpeechSynthesisVoice[] }) {
  const log: TtsLogEntry[] = [];
  let speaking = false;
  const voices = options?.voices ?? [
    mockVoice("English UK", "en-GB"),
    mockVoice("Akan Ghana", "ak-GH"),
  ];

  const synth = {
    get speaking() {
      return speaking;
    },
    get pending() {
      return speaking;
    },
    paused: false,
    getVoices: () => voices,
    cancel: vi.fn(() => {
      log.push({ type: "cancel" });
      speaking = false;
    }),
    resume: vi.fn(),
    speak: vi.fn((utterance: SpeechSynthesisUtterance) => {
      log.push({
        type: "speak",
        text: utterance.text,
        lang: utterance.lang,
        voiceName: utterance.voice?.name,
      });
      speaking = true;
    }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
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
    setInterval: (fn: () => void, ms?: number) => globalThis.setInterval(fn, ms ?? 0),
    clearInterval: globalThis.clearInterval,
  });

  return { log, synth };
}

describe("GigaLearn speech runtime (mocked SpeechSynthesis)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("speaks pronunciation parts one at a time in order", async () => {
    const { log, synth } = installSpeechMock();
    const { speakPronunciationSequence } = await import("../../web/lib/gigalearn/speechSynthesis");

    await speakPronunciationSequence([
      { text: "Banana", voiceId: "english" },
      { text: "Kwadu", voiceId: "abena-twi", requireNative: true },
    ]);
    await new Promise((resolve) => setTimeout(resolve, 80));

    const spoken = () => log.filter((entry) => entry.type === "speak");
    expect(spoken()).toHaveLength(1);
    expect(spoken()[0]?.text).toBe("Banana");
    expect(spoken()[0]?.lang).toBe("en-GB");

    const first = synth.speak.mock.calls[0]?.[0] as SpeechSynthesisUtterance;
    synth._finishSpeaking(first);
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(spoken()).toHaveLength(2);
    expect(spoken()[1]?.text).toBe("Kwadu");
    expect(spoken()[1]?.lang).toBe("ak-GH");
    expect(spoken()[1]?.voiceName).toBe("Akan Ghana");
  });

  it("cancels chat playback when GigaLearn pronunciation starts", async () => {
    const { log } = installSpeechMock();
    const { speakGigaVoice, isGigaVoiceSpeaking, getActiveSpeechBlockId } = await import(
      "../../web/lib/chat/gigaVoice"
    );
    const { speakPronunciationSequence } = await import("../../web/lib/gigalearn/speechSynthesis");

    await speakGigaVoice({ text: "Chat paragraph.", voiceId: "english-british", blockId: "chat-1" });
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(log.filter((entry) => entry.type === "speak")).toHaveLength(1);
    expect(isGigaVoiceSpeaking()).toBe(true);

    log.length = 0;
    await speakPronunciationSequence([{ text: "Apple", voiceId: "english" }]);
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(log.map((entry) => entry.type)).toEqual(["cancel", "speak"]);
    expect(isGigaVoiceSpeaking()).toBe(false);
    expect(getActiveSpeechBlockId()).toBeNull();
  });

  it("cancels GigaLearn playback when chat read-aloud starts", async () => {
    const { log, synth } = installSpeechMock();
    const { speakPronunciationSequence } = await import("../../web/lib/gigalearn/speechSynthesis");
    const { speakGigaVoice } = await import("../../web/lib/chat/gigaVoice");

    await speakPronunciationSequence([
      { text: "Dog", voiceId: "english" },
      { text: "Kare", voiceId: "musa-hausa", requireNative: true },
    ]);
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(log.filter((entry) => entry.type === "speak")).toHaveLength(1);

    log.length = 0;
    await speakGigaVoice({ text: "New chat read aloud.", voiceId: "english-british" });
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(log.map((entry) => entry.type)).toEqual(["cancel", "speak"]);
    expect(synth.speak.mock.calls.at(-1)?.[0]?.text).toBe("New chat read aloud.");
  });
});
