import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  countGhanaCatalogByKind,
  GHANA_MEDIA_CATALOG,
} from "../../web/lib/gigalearn/mediaLibrary/catalog.ghana";
import { assertCatalogCountryMetadata } from "../../web/lib/gigalearn/mediaLibrary/catalog";
import { DISCOVER_CATEGORIES } from "../../web/lib/gigalearn/mediaLibrary/types";
import { requiredRemoteAssets } from "../../web/lib/gigalearn/mediaLibrary/offlineMedia";
import { GIGALEARN_VOICE_LANG, resolveBrowserVoiceForProfile } from "../../web/lib/gigalearn/speechSynthesis";
import { scoreWarmMaleVoice } from "../../web/lib/speech/matchBrowserVoice";
import { GIGALEARN_VOICES } from "../../web/lib/gigalearn/concreteObjects";

function mockVoice(name: string, lang: string): SpeechSynthesisVoice {
  return { name, lang, voiceURI: `${name}-${lang}`, localService: true } as SpeechSynthesisVoice;
}

describe("GigaLearn Phase 2 catalogue targets", () => {
  const counts = countGhanaCatalogByKind();

  it("meets minimum content counts for Ghana KG1–P2", () => {
    expect(counts.rhymesPoems).toBeGreaterThanOrEqual(20);
    expect(counts.songs).toBeGreaterThanOrEqual(15);
    expect(counts.africanStories).toBeGreaterThanOrEqual(20);
    expect(counts.videosAnimation).toBeGreaterThanOrEqual(10);
    expect(
      counts.picturesObjects + counts.animalsNature + counts.numbersLetters
    ).toBeGreaterThanOrEqual(20);
    expect(counts.total).toBeGreaterThanOrEqual(85);
    expect(new Set(GHANA_MEDIA_CATALOG.map((i) => i.id)).size).toBe(GHANA_MEDIA_CATALOG.length);
  });

  it("keeps complete metadata and on-disk required assets", () => {
    expect(assertCatalogCountryMetadata(GHANA_MEDIA_CATALOG)).toEqual([]);
    const withRequired = GHANA_MEDIA_CATALOG.filter((i) => requiredRemoteAssets(i).length > 0);
    expect(withRequired.length).toBeGreaterThan(50);
    for (const item of withRequired.slice(0, 40)) {
      for (const asset of requiredRemoteAssets(item)) {
        const file = resolve(__dirname, "../../web/public", asset.url.replace(/^\//, ""));
        expect(existsSync(file), asset.url).toBe(true);
        expect(readFileSync(file).byteLength).toBeGreaterThan(0);
      }
    }
  });

  it("exposes the Phase 2 Discover category set", () => {
    const ids = DISCOVER_CATEGORIES.map((c) => c.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "rhymes-poems",
        "songs",
        "pictures-objects",
        "animals-nature",
        "african-stories",
        "videos-animation",
        "numbers-letters",
        "culture-occupations",
        "games",
        "offline",
      ])
    );
  });
});

describe("GigaLearn male voice selection (female unchanged)", () => {
  it("marks only male profiles with preferWarmMale", () => {
    expect(GIGALEARN_VOICE_LANG.english?.preferWarmMale).toBe(true);
    expect(GIGALEARN_VOICE_LANG["musa-hausa"]?.preferWarmMale).toBe(true);
    expect(GIGALEARN_VOICE_LANG["kofi-ewe"]?.preferWarmMale).toBe(true);
    expect(GIGALEARN_VOICE_LANG["abena-twi"]?.preferWarmMale).toBeFalsy();
    expect(GIGALEARN_VOICE_LANG["naa-ga"]?.preferWarmMale).toBeFalsy();
    expect(GIGALEARN_VOICE_LANG["ade-yoruba"]?.preferWarmMale).toBeFalsy();
    expect(GIGALEARN_VOICE_LANG["zawadi-swahili"]?.preferWarmMale).toBeFalsy();
  });

  it("keeps female Abena/Naa voice labels and ids unchanged", () => {
    expect(GIGALEARN_VOICES.find((v) => v.id === "abena-twi")?.name).toBe("Abena");
    expect(GIGALEARN_VOICES.find((v) => v.id === "naa-ga")?.name).toBe("Naa");
    expect(GIGALEARN_VOICES.find((v) => v.id === "abena-twi")?.language).toMatch(/Female/);
    expect(GIGALEARN_VOICES.find((v) => v.id === "naa-ga")?.language).toMatch(/Female/);
  });

  it("selects a warmer male English voice when available", () => {
    const voices = [
      mockVoice("eSpeak Compact", "en-GB"),
      mockVoice("Google UK English Male", "en-GB"),
      mockVoice("Microsoft Aria Neural", "en-GB"),
    ];
    expect(scoreWarmMaleVoice(voices[1]!)).toBeGreaterThan(scoreWarmMaleVoice(voices[0]!));
    const resolved = resolveBrowserVoiceForProfile(voices, "english");
    expect(resolved.voice?.name).toMatch(/Neural|Male|Natural/i);
    expect(resolved.voice?.name).not.toMatch(/eSpeak/i);
  });

  it("does not rewrite female Twi matching when a warm male English voice exists", () => {
    const voices = [
      mockVoice("Google UK English Male", "en-GB"),
      mockVoice("Abena Twi", "ak-GH"),
    ];
    const twi = resolveBrowserVoiceForProfile(voices, "abena-twi");
    expect(twi.voice?.lang).toBe("ak-GH");
    expect(twi.native).toBe(true);
  });
});
