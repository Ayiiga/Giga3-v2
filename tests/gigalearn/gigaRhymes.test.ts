import { describe, expect, it } from "vitest";
import {
  GIGA_RHYMES,
  RHYME_CATEGORIES,
  getRhyme,
  nextRhyme,
  parseGeneratedRhyme,
  rhymesInCategory,
} from "../../web/lib/gigalearn/rhymes/library";
import { ORIGINAL_RHYME_LABEL } from "../../web/lib/gigalearn/rhymes/types";

// Opening lines of well-known nursery rhymes and children's songs that must never appear.
const WELL_KNOWN_PHRASES = [
  /twinkle,? twinkle/i,
  /baa,? baa/i,
  /humpty dumpty/i,
  /jack and jill/i,
  /old macdonald/i,
  /row,? row,? row your boat/i,
  /itsy bitsy|incy wincy/i,
  /head,? shoulders,? knees and toes/i,
  /wheels on the bus/i,
  /if you'?re happy and you know it/i,
  /mary had a little lamb/i,
  /one,? two,? buckle my shoe/i,
  /five little (ducks|monkeys)/i,
  /london bridge/i,
  /pat-?a-?cake/i,
  /rain,? rain,? go away/i,
];

describe("GigaRhymes library", () => {
  it("covers all 12 categories with at least two rhymes each", () => {
    expect(RHYME_CATEGORIES).toHaveLength(12);
    for (const category of RHYME_CATEGORIES) {
      expect(rhymesInCategory(category.id).length).toBeGreaterThanOrEqual(2);
    }
    expect(GIGA_RHYMES).toHaveLength(25);
  });

  it("has unique ids and complete typed metadata", () => {
    const ids = new Set(GIGA_RHYMES.map((rhyme) => rhyme.id));
    expect(ids.size).toBe(GIGA_RHYMES.length);
    for (const rhyme of GIGA_RHYMES) {
      expect(rhyme.title).toBeTruthy();
      expect(rhyme.learningObjective).toBeTruthy();
      expect(rhyme.lyrics.length).toBeGreaterThanOrEqual(4);
      expect(rhyme.questions.length).toBeGreaterThan(0);
      for (const question of rhyme.questions) expect(question.options).toContain(question.answer);
      expect(rhyme.activities.length).toBeGreaterThan(0);
      expect(rhyme.culturalContext).toBeTruthy();
      expect(rhyme.region).toBeTruthy();
      expect(rhyme.audio.kind).toBe("tts");
    }
  });

  it("is all original content, unreviewed, with no well-known lyrics", () => {
    for (const rhyme of GIGA_RHYMES) {
      expect(rhyme.sourceType).toBe("original");
      expect(rhyme.originalContent).toBe(true);
      expect(rhyme.reviewed).toBe(false);
      const text = `${rhyme.title}\n${rhyme.lyrics.join("\n")}`;
      for (const phrase of WELL_KNOWN_PHRASES) expect(text).not.toMatch(phrase);
      expect(JSON.stringify(rhyme)).not.toMatch(/copyright[- ]free/i);
    }
    expect(ORIGINAL_RHYME_LABEL).toBe("Original Giga3 educational content");
  });

  it("African Languages rhymes name specific languages with a glossary", () => {
    const languages = rhymesInCategory("african-languages");
    expect(languages.length).toBeGreaterThanOrEqual(3);
    for (const rhyme of languages) {
      expect(rhyme.language).not.toMatch(/^african$/i);
      expect(rhyme.glossary?.length).toBeGreaterThan(0);
    }
  });

  it("navigates to the next rhyme and stops at the end", () => {
    const first = GIGA_RHYMES[0]!;
    expect(getRhyme(first.id)).toBe(first);
    expect(nextRhyme(first.id)?.id).toBe(GIGA_RHYMES[1]!.id);
    expect(nextRhyme(GIGA_RHYMES[GIGA_RHYMES.length - 1]!.id)).toBeNull();
  });

  it("parses generated rhymes as original, unreviewed content", () => {
    const rhyme = parseGeneratedRhyme("# Rain on the Roof\n\n## Lyrics\nPitter on the zinc roof,\nPatter on the ground,\nRain in Kumasi\nMakes a happy sound.\n\n## Activities\n- Tap the table like rain", {
      category: "nature-environment",
      ageRange: "4–6",
      learningObjective: "Weather words",
      language: "English",
      culturalContext: "Rainy season",
    });
    expect(rhyme?.title).toBe("Rain on the Roof");
    expect(rhyme?.lyrics.length).toBe(4);
    expect(rhyme?.sourceType).toBe("original");
    expect(rhyme?.reviewed).toBe(false);
  });
});
