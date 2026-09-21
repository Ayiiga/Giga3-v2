import { describe, expect, it } from "vitest";
import {
  GIGALEARN_VOICE_LANG,
  resolveBrowserVoiceForProfile,
} from "../../web/lib/gigalearn/speechSynthesis";

function mockVoice(name: string, lang: string): SpeechSynthesisVoice {
  return { name, lang, voiceURI: `${name}-${lang}`, localService: true } as SpeechSynthesisVoice;
}

describe("GigaLearn speech synthesis voice resolution", () => {
  it("maps English first and African voices to real BCP-47 tags", () => {
    expect(GIGALEARN_VOICE_LANG.english?.primary).toBe("en-GB");
    expect(GIGALEARN_VOICE_LANG["abena-twi"]?.primary).toBe("ak-GH");
    expect(GIGALEARN_VOICE_LANG["naa-ga"]?.primary).toBe("gaa-GH");
    expect(GIGALEARN_VOICE_LANG["musa-hausa"]?.primary).toBe("ha-NG");
    expect(GIGALEARN_VOICE_LANG["kofi-ewe"]?.primary).toBe("ee-GH");
    expect(GIGALEARN_VOICE_LANG["zawadi-swahili"]?.primary).toBe("sw-KE");
  });

  it("prefers an installed voice matching the selected profile language", () => {
    const voices = [
      mockVoice("English US", "en-US"),
      mockVoice("Twi Ghana", "tw-GH"),
      mockVoice("Hausa", "ha-NG"),
    ];
    const resolved = resolveBrowserVoiceForProfile(voices, "abena-twi");
    expect(resolved.lang).toBe("tw-GH");
    expect(resolved.voice?.lang).toBe("tw-GH");
    expect(resolved.native).toBe(true);
  });

  it("does not treat an English voice as a Twi or Ga voice", () => {
    const voices = [mockVoice("English Ghana", "en-GH"), mockVoice("English US", "en-US")];
    const twi = resolveBrowserVoiceForProfile(voices, "abena-twi");
    expect(twi.native).toBe(false);
    expect(twi.lang).toBe("en-US");
    const ga = resolveBrowserVoiceForProfile(voices, "naa-ga");
    expect(ga.native).toBe(false);
    expect(ga.lang).toBe("en-US");
  });

  it("uses a default English voice when no African-language voice is installed", () => {
    const voices = [mockVoice("English US", "en-US")];
    const resolved = resolveBrowserVoiceForProfile(voices, "ade-yoruba");
    expect(resolved.voice?.lang).toBe("en-US");
  });
});
