import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONCRETE_CATEGORIES,
  CONCRETE_QUIZZES,
  FRUIT_POLL,
  GES_STRANDS,
  GIGALEARN_VOICES,
  LESSON_PREVIEWS,
  checkConcreteAnswer,
  getGigaLearnVoice,
  lessonPreviewForLevel,
} from "../../web/lib/gigalearn/concreteObjects";
import {
  GIGALEARN_LEVELS,
  LOWER_GRADE_LEVELS,
  countRangeForLevel,
  isLowerGrade,
} from "../../web/lib/gigalearn/levels";

describe("gigalearn lower grades concrete objects", () => {
  it("covers Creche–P3 plus upper levels in the selector", () => {
    const ids = GIGALEARN_LEVELS.map((l) => l.id);
    for (const required of ["Creche", "KG1", "KG2", "P1", "P2", "P3", "P4-P6", "JHS1-3", "SHS1-3", "University", "Adult"]) {
      expect(ids).toContain(required);
    }
    expect(LOWER_GRADE_LEVELS).toEqual(["Creche", "KG1", "KG2", "P1", "P2", "P3"]);
  });

  it("routes lower grades to concrete objects, upper grades to curriculum", () => {
    for (const level of ["Creche", "KG1", "KG2", "P1", "P2", "P3"]) {
      expect(isLowerGrade(level)).toBe(true);
    }
    for (const level of ["P4-P6", "JHS1-3", "SHS1-3", "University", "Adult"]) {
      expect(isLowerGrade(level)).toBe(false);
    }
  });

  it("keeps KG counting within 1–5 with concrete fruit catalog", () => {
    expect(countRangeForLevel("KG1")).toEqual({ min: 1, max: 5 });
    expect(countRangeForLevel("P2")).toEqual({ min: 1, max: 10 });
    const fruits = CONCRETE_CATEGORIES.find((c) => c.id === "fruits")!;
    expect(fruits.items.map((i) => i.id)).toEqual(
      expect.arrayContaining(["apple", "banana", "orange", "mango", "pawpaw"])
    );
    expect(CONCRETE_CATEGORIES.map((c) => c.id)).toEqual(
      expect.arrayContaining(["vegetables", "animals", "shapes", "colors", "body"])
    );
  });

  it("grades concrete quizzes by exact count (bananas = 3)", () => {
    const bananas = CONCRETE_QUIZZES.find((q) => q.id === "q-bananas-3")!;
    expect(checkConcreteAnswer(bananas, 3)).toBe(true);
    expect(checkConcreteAnswer(bananas, 2)).toBe(false);
    for (const quiz of CONCRETE_QUIZZES) {
      expect(quiz.options).toContain(quiz.answer);
      expect(quiz.concreteRow.length).toBe(quiz.answer);
    }
    expect(FRUIT_POLL.answer).toBe("Banana 🍌");
  });

  it("previews concrete lessons per level (P2 addition, P3 subtraction)", () => {
    expect(lessonPreviewForLevel("KG1").concreteAnswer).toBe("= 3 apples");
    expect(lessonPreviewForLevel("P2").concreteAnswer).toBe("= 2 oranges");
    expect(lessonPreviewForLevel("P3").concreteAnswer).toBe("= 3 mangoes");
    expect(lessonPreviewForLevel("SHS1-3").level).toBe("KG1"); // safe fallback
    expect(LESSON_PREVIEWS.every((l) => l.teleprompterNote.includes("TOP 25%"))).toBe(true);
  });

  it("passes voice ids into browser speech preview helpers", () => {
    const source = readFileSync(resolve(__dirname, "../../web/components/gigalearn/LowerGradesConcrete.tsx"), "utf8");
    expect(source).toContain("speakPronunciationSequence");
    expect(source).toContain("buildItemPronunciationPlan");
    expect(source).toContain("GroupedTemplate");
    expect(source).toContain("voice.id");
  });

  it("ships English as the primary voice plus Twi/Hausa/Ga/Ewe/Yoruba/Swahili", () => {
    expect(GIGALEARN_VOICES[0]?.id).toBe("english");
    expect(GIGALEARN_VOICES.map((v) => v.id)).toEqual(
      expect.arrayContaining(["english", "abena-twi", "musa-hausa", "naa-ga", "kofi-ewe", "ade-yoruba", "zawadi-swahili"])
    );
    expect(lessonPreviewForLevel("KG1").textTwi).toContain("aprɛ");
    expect(lessonPreviewForLevel("KG1").textTwi.toLowerCase()).not.toContain("mango");
    expect(lessonPreviewForLevel("KG1").voiceId).toBe("english");
    expect(getGigaLearnVoice("abena-twi")?.flag).toBe("🇬🇭");
    expect(GES_STRANDS.map((g) => g.level)).toEqual(
      expect.arrayContaining(["KG1–KG2", "Primary 1–3"])
    );
  });

  it("never shows the KG1 fallback preview outside Creche–P3 (SHS level-leak guard)", () => {
    // lessonPreviewForLevel falls back to KG1 for levels without a dedicated
    // preview — the LessonPreviewCard must stay hidden there (isLowerGrade).
    for (const level of ["P4-P6", "JHS1-3", "SHS1-3", "University", "Adult"]) {
      expect(LESSON_PREVIEWS.some((l) => l.level === level)).toBe(false);
      expect(lessonPreviewForLevel(level).level).toBe("KG1");
      expect(isLowerGrade(level)).toBe(false);
    }
    for (const level of ["Creche", "KG1", "KG2", "P1", "P2", "P3"]) {
      expect(isLowerGrade(level)).toBe(true);
    }
  });
});
