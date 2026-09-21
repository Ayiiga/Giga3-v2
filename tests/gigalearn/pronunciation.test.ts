import { describe, expect, it } from "vitest";
import { CONCRETE_CATEGORIES } from "../../web/lib/gigalearn/concreteObjects";
import {
  buildItemPronunciationPlan,
  buildVoiceSamplePlan,
  ITEM_PRONUNCIATION,
} from "../../web/lib/gigalearn/pronunciation";
import { resolvePronunciationParts } from "../../web/lib/gigalearn/speechSynthesis";

function mockVoice(name: string, lang: string): SpeechSynthesisVoice {
  return { name, lang, voiceURI: `${name}-${lang}`, localService: true } as SpeechSynthesisVoice;
}

describe("concrete object pronunciation", () => {
  it("gives every fruit, vegetable, animal, and other concrete item a local name", () => {
    for (const category of CONCRETE_CATEGORIES) {
      for (const item of category.items) {
        const words = ITEM_PRONUNCIATION[item.id];
        expect(words, item.id).toBeTruthy();
        for (const key of ["twi", "hausa", "ga", "ewe", "yoruba", "swahili"] as const) {
          expect(words[key].text.length).toBeGreaterThan(0);
          expect(words[key].phonetic.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("speaks English first and does not add a second line for the English voice", () => {
    const plan = buildItemPronunciationPlan("apple", "Apple", "english");
    expect(plan).toEqual([{ text: "Apple", voiceId: "english" }]);
  });

  it("uses an English phonetic guide when Twi is selected but not installed", () => {
    const voices = [mockVoice("English US", "en-US")];
    const plan = buildItemPronunciationPlan("banana", "Banana", "abena-twi");
    const spoken = resolvePronunciationParts(voices, plan);
    expect(spoken.map((part) => part.text)).toEqual([
      "Banana",
      "In Twi: kwah-doo.",
    ]);
    expect(spoken.every((part) => part.lang === "en-US")).toBe(true);
  });

  it("speaks Hausa orthography when a Hausa voice is installed", () => {
    const voices = [mockVoice("English US", "en-US"), mockVoice("Hausa", "ha-NG")];
    const plan = buildItemPronunciationPlan("dog", "Dog", "musa-hausa");
    const spoken = resolvePronunciationParts(voices, plan);
    expect(spoken[0]).toMatchObject({ text: "Dog", lang: "en-US" });
    expect(spoken[1]).toMatchObject({ text: "Kare", lang: "ha-NG" });
  });

  it("keeps Ga off the Ghanaian English voice", () => {
    const voices = [mockVoice("English Ghana", "en-GH")];
    const spoken = resolvePronunciationParts(
      voices,
      buildItemPronunciationPlan("goat", "Goat", "naa-ga")
    );
    expect(spoken[1]?.text).toBe("In Ga: toh-ee.");
    expect(spoken[1]?.lang).toBe("en-GH");
    expect(spoken[1]?.text).not.toBe("Tooi");
  });

  it("starts an African voice sample in English, then the local greeting", () => {
    const voices = [mockVoice("English UK", "en-GB"), mockVoice("Akan", "ak-GH")];
    const spoken = resolvePronunciationParts(voices, buildVoiceSamplePlan("abena-twi"));
    expect(spoken[0]?.text).toContain("Abena");
    expect(spoken[0]?.lang).toBe("en-GB");
    expect(spoken[1]?.lang).toBe("ak-GH");
    expect(spoken[1]?.text).toContain("Abena");
  });
});
