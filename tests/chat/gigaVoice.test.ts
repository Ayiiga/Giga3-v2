import { describe, expect, it } from "vitest";
import {
  GIGA_CHAT_VOICES,
  GIGA_VOICE_LANG,
  resolveBrowserVoiceForId,
} from "../../web/lib/chat/gigaVoice";

function mockVoice(name: string, lang: string): SpeechSynthesisVoice {
  return { name, lang, voiceURI: `${name}-${lang}`, localService: true } as SpeechSynthesisVoice;
}

describe("Giga3 shared voice layer", () => {
  it("exposes African chat voice profiles including Twi, Hausa, Ga, Ewe, Yoruba, Swahili", () => {
    const ids = GIGA_CHAT_VOICES.map((v) => v.id);
    expect(ids).toContain("abena-twi");
    expect(ids).toContain("musa-hausa");
    expect(ids).toContain("naa-ga");
    expect(ids).toContain("kofi-ewe");
    expect(ids).toContain("adaeze-yoruba");
    expect(ids).toContain("zawadi-swahili");
  });

  it("maps voice ids to BCP-47 language tags with fallbacks", () => {
    expect(GIGA_VOICE_LANG["abena-twi"]?.primary).toBe("ak-GH");
    expect(GIGA_VOICE_LANG["musa-hausa"]?.primary).toBe("ha-NG");
    expect(GIGA_VOICE_LANG["zawadi-swahili"]?.primary).toBe("sw-KE");
  });

  it("prefers an installed voice matching the selected profile language", () => {
    const voices = [
      mockVoice("English US", "en-US"),
      mockVoice("Hausa Nigeria", "ha-NG"),
    ];
    const resolved = resolveBrowserVoiceForId(voices, "musa-hausa");
    expect(resolved.voice?.lang).toBe("ha-NG");
  });

  it("falls back to English when the requested African voice is unavailable", () => {
    const voices = [mockVoice("English US", "en-US")];
    const resolved = resolveBrowserVoiceForId(voices, "abena-twi");
    expect(resolved.voice?.lang).toBe("en-US");
  });
});
