import { describe, expect, it } from "vitest";
import {
  GIGALEARN_VOICE_LANG,
  resolveBrowserVoiceForProfile,
} from "../../web/lib/gigalearn/speechSynthesis";

function mockVoice(name: string, lang: string): SpeechSynthesisVoice {
  return { name, lang, voiceURI: `${name}-${lang}`, localService: true } as SpeechSynthesisVoice;
}

describe("GigaLearn speech synthesis voice resolution", () => {
  it("maps each African voice profile to BCP-47 language tags", () => {
    expect(GIGALEARN_VOICE_LANG["abena-twi"]?.primary).toBe("tw-GH");
    expect(GIGALEARN_VOICE_LANG["musa-hausa"]?.primary).toBe("ha-NG");
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
  });

  it("falls back through broader language tags when an exact voice is unavailable", () => {
    const voices = [mockVoice("English Ghana", "en-GH"), mockVoice("English US", "en-US")];
    const resolved = resolveBrowserVoiceForProfile(voices, "abena-twi");
    expect(resolved.voice?.lang).toMatch(/^en/);
  });

  it("uses a default English voice when no African-language voice is installed", () => {
    const voices = [mockVoice("English US", "en-US")];
    const resolved = resolveBrowserVoiceForProfile(voices, "ade-yoruba");
    expect(resolved.voice?.lang).toBe("en-US");
  });
});
