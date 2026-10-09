import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  countGhanaCatalogByKind,
  GHANA_MEDIA_CATALOG,
} from "../../web/lib/gigalearn/mediaLibrary/catalog.ghana";
import { GHANA_PHASE2_RHYMES } from "../../web/lib/gigalearn/mediaLibrary/catalog.ghana.rhymes";
import { GHANA_PHASE2_SONGS } from "../../web/lib/gigalearn/mediaLibrary/catalog.ghana.songs";
import { GHANA_PHASE2_VIDEOS } from "../../web/lib/gigalearn/mediaLibrary/catalog.ghana.videos";
import { assertCatalogCountryMetadata } from "../../web/lib/gigalearn/mediaLibrary/catalog";
import { DISCOVER_CATEGORIES } from "../../web/lib/gigalearn/mediaLibrary/types";
import { requiredRemoteAssets } from "../../web/lib/gigalearn/mediaLibrary/offlineMedia";
import { GIGALEARN_VOICE_LANG, resolveBrowserVoiceForProfile } from "../../web/lib/gigalearn/speechSynthesis";
import { scoreWarmMaleVoice } from "../../web/lib/speech/matchBrowserVoice";
import { GIGALEARN_VOICES } from "../../web/lib/gigalearn/concreteObjects";

const MEDIA_DIR = resolve(__dirname, "../../web/public/gigalearn/media/ghana/phase2");

function mockVoice(name: string, lang: string): SpeechSynthesisVoice {
  return { name, lang, voiceURI: `${name}-${lang}`, localService: true } as SpeechSynthesisVoice;
}

function shapeSignature(svg: string): string {
  const stripped = svg
    .replace(/<text[\s\S]*?<\/text>/g, "")
    .replace(/aria-label="[^"]*"/g, "");
  return createHash("sha256").update(stripped).digest("hex").slice(0, 16);
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
    for (const item of withRequired) {
      for (const asset of requiredRemoteAssets(item)) {
        const file = resolve(__dirname, "../../web/public", asset.url.replace(/^\//, ""));
        expect(existsSync(file), asset.url).toBe(true);
        expect(readFileSync(file).byteLength).toBeGreaterThan(0);
      }
      const remoteSum =
        item.remoteMedia?.reduce((sum, asset) => sum + (asset.estimatedBytes || 0), 0) ?? 0;
      if (remoteSum > 0) {
        expect(item.estimatedOfflineBytes).toBeGreaterThanOrEqual(remoteSum);
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
    const songsCat = DISCOVER_CATEGORIES.find((c) => c.id === "songs");
    expect(songsCat?.description.toLowerCase()).toMatch(/spoken|chant/);
    expect(songsCat?.description.toLowerCase()).toMatch(/not melodic|not a melodic/);
  });

  it("gives every Phase 2 rhyme complete poem text and subject art", () => {
    expect(GHANA_PHASE2_RHYMES).toHaveLength(20);
    const artSigs = new Set<string>();
    for (const rhyme of GHANA_PHASE2_RHYMES) {
      expect(rhyme.description.length).toBeGreaterThan(40);
      expect(rhyme.narrations[0]?.text.split(/\s+/).length).toBeGreaterThanOrEqual(8);
      expect(rhyme.rights.source.toLowerCase()).toMatch(/spoken|espeak|narration/);
      const svg = rhyme.remoteMedia?.find((a) => a.mimeType === "image/svg+xml");
      expect(svg).toBeTruthy();
      const file = resolve(__dirname, "../../web/public", svg!.url.replace(/^\//, ""));
      artSigs.add(shapeSignature(readFileSync(file, "utf8")));
    }
    expect(artSigs.size).toBe(20);
  });

  it("labels Songs items as spoken lyric chants, not melodic music", () => {
    expect(GHANA_PHASE2_SONGS).toHaveLength(15);
    for (const song of GHANA_PHASE2_SONGS) {
      expect(song.topic.toLowerCase()).toMatch(/spoken|chant/);
      expect(song.description.toLowerCase()).toContain("spoken lyric chant");
      expect(song.description.toLowerCase()).toContain("not a melodic music recording");
      expect(song.rights.source.toLowerCase()).toContain("not a melodic music recording");
      expect(song.game?.prompt.toLowerCase() ?? "").toMatch(/spoken chant|say the words/);
      expect(song.game?.prompt.toLowerCase() ?? "").not.toContain("singing together");
    }
  });

  it("ships 10 MP4 storyboards with three distinct SVG frames each", () => {
    expect(GHANA_PHASE2_VIDEOS).toHaveLength(10);
    const mp4s = readdirSync(MEDIA_DIR).filter((f) => f.endsWith(".mp4"));
    expect(mp4s).toHaveLength(10);
    for (const video of GHANA_PHASE2_VIDEOS) {
      const frames = (video.remoteMedia ?? []).filter((a) => a.mimeType === "image/svg+xml");
      expect(frames.length).toBeGreaterThanOrEqual(3);
      const sigs = frames.slice(0, 3).map((frame) => {
        const file = resolve(__dirname, "../../web/public", frame.url.replace(/^\//, ""));
        expect(existsSync(file), frame.url).toBe(true);
        return shapeSignature(readFileSync(file, "utf8"));
      });
      expect(new Set(sigs).size, video.id).toBe(3);
      const mp4 = video.remoteMedia?.find((a) => a.mimeType === "video/mp4");
      expect(mp4, video.id).toBeTruthy();
      const mp4File = resolve(__dirname, "../../web/public", mp4!.url.replace(/^\//, ""));
      expect(existsSync(mp4File)).toBe(true);
      expect(readFileSync(mp4File).byteLength).toBeGreaterThan(20_000);
      expect(readFileSync(mp4File).byteLength).toBeLessThan(500_000);
    }
    // Banana counting must not use mango-shaped art
    const bananaFrame = readFileSync(resolve(MEDIA_DIR, "video-p2-1-f1.svg"), "utf8");
    expect(bananaFrame).toMatch(/One banana/i);
    expect(bananaFrame).toMatch(/FDD835|FFEE58/);
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
