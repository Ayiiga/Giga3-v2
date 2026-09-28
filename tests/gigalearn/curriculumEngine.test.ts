import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyCurriculumChange,
  applyLevelChange,
  checkCombination,
  CURRICULUM_COUNTRIES,
  DEFAULT_CURRICULUM_SELECTION,
  EXTRA_CONTEXT_FIELDS,
  getCurriculaForCountry,
  getLevelsForCurriculum,
  getSubjectsForLevel,
  getSubject,
  isSubjectAvailableForLevel,
  resolveLegacyLevelId,
  resolveSubjectId,
  subjectPlaceholder,
} from "../../web/lib/gigalearn/curriculumEngine";
import { EDUCATION_LEVELS, SUBJECTS } from "../../web/lib/gigalearn/curricula";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

const JHS_OFFICIAL = [
  "english-language",
  "mathematics",
  "science",
  "social-studies",
  "computing",
  "career-technology",
  "creative-arts-design",
  "rme",
  "physical-health-education",
  "ghanaian-language",
  "french",
  "arabic",
];

describe("Ghana NaCCA curriculum hierarchy", () => {
  it("offers Ghana first with future African curricula planned", () => {
    const ghana = CURRICULUM_COUNTRIES.find((c) => c.id === "ghana");
    expect(ghana?.available).toBe(true);
    expect(ghana?.flag).toBe("🇬🇭");
    for (const id of ["nigeria", "kenya", "uganda", "tanzania", "south-africa"]) {
      expect(CURRICULUM_COUNTRIES.some((c) => c.id === id)).toBe(true);
    }
  });

  it("exposes Common Core Programme and SHS curricula for Ghana", () => {
    const ids = getCurriculaForCountry("ghana").map((c) => c.id);
    expect(ids).toContain("gh-ccp");
    expect(ids).toContain("gh-shs");
  });

  it("models the full level hierarchy KG → Primary → JHS → SHS", () => {
    const ccp = getLevelsForCurriculum("gh-ccp").map((l) => l.id);
    expect(ccp).toEqual([
      "kg-1",
      "kg-2",
      "basic-1",
      "basic-2",
      "basic-3",
      "basic-4",
      "basic-5",
      "basic-6",
      "basic-7",
      "basic-8",
      "basic-9",
    ]);
    expect(getLevelsForCurriculum("gh-shs").map((l) => l.id)).toEqual([
      "basic-10",
      "basic-11",
      "basic-12",
    ]);
  });

  it("labels JHS/SHS levels with Basic + school names", () => {
    const labels = new Map(getLevelsForCurriculum("gh-ccp").map((l) => [l.id, l.label]));
    expect(labels.get("basic-7")).toBe("Basic 7 / JHS 1");
    expect(labels.get("basic-8")).toBe("Basic 8 / JHS 2");
    expect(labels.get("basic-9")).toBe("Basic 9 / JHS 3");
  });
});

describe("dependent subject lists (no invalid combinations)", () => {
  it("offers all 12 official JHS subjects including Computing and Career Technology", () => {
    const ids = getSubjectsForLevel("basic-8").map((s) => s.id);
    for (const expected of JHS_OFFICIAL) {
      expect(ids).toContain(expected);
    }
  });

  it("uses Computing as the official JHS subject name — never Coding", () => {
    const ids = getSubjectsForLevel("basic-8").map((s) => s.id);
    expect(ids).toContain("computing");
    expect(ids).not.toContain("coding");
    expect(getSubject("computing")?.label).toBe("Computing");
  });

  it("shows professional icons for every JHS subject", () => {
    const icons = new Map(getSubjectsForLevel("basic-7").map((s) => [s.id, s.icon]));
    expect(icons.get("english-language")).toBe("📚");
    expect(icons.get("mathematics")).toBe("🔢");
    expect(icons.get("science")).toBe("🔬");
    expect(icons.get("social-studies")).toBe("🌍");
    expect(icons.get("computing")).toBe("💻");
    expect(icons.get("career-technology")).toBe("🛠️");
    expect(icons.get("creative-arts-design")).toBe("🎨");
    expect(icons.get("rme")).toBe("🙏");
    expect(icons.get("physical-health-education")).toBe("🏃");
    expect(icons.get("ghanaian-language")).toBe("🗣️");
    expect(icons.get("french")).toBe("🇫🇷");
    expect(icons.get("arabic")).toBe("🕌");
  });

  it("never allows JHS subjects to combine with KG", () => {
    expect(isSubjectAvailableForLevel("career-technology", "kg-1")).toBe(false);
    expect(isSubjectAvailableForLevel("career-technology", "kg-2")).toBe(false);
    expect(isSubjectAvailableForLevel("computing", "kg-1")).toBe(false);
    const check = checkCombination("kg-1", "career-technology");
    expect(check.valid).toBe(false);
    expect(check.message).toContain("Career Technology is available for JHS / Common Core learners.");
  });

  it("keeps KG subjects KG-compatible", () => {
    const ids = getSubjectsForLevel("kg-1").map((s) => s.id);
    expect(ids).toContain("english-language");
    expect(ids).toContain("mathematics");
    expect(ids).not.toContain("career-technology");
    expect(ids).not.toContain("computing");
    expect(ids).not.toContain("arabic");
  });

  it("keeps Primary and SHS subject lists working", () => {
    const primary = getSubjectsForLevel("basic-4").map((s) => s.id);
    expect(primary).toContain("mathematics");
    expect(primary).toContain("english-language");
    expect(primary).toContain("science");
    expect(primary).not.toContain("career-technology");
    const shs = getSubjectsForLevel("basic-11").map((s) => s.id);
    expect(shs).toContain("mathematics");
    expect(shs).toContain("physics");
    expect(shs).toContain("biology");
    expect(shs).not.toContain("career-technology");
  });
});

describe("smart validation resets stale selections", () => {
  it("clears the subject when the level becomes incompatible (JHS → KG)", () => {
    const prev = { ...DEFAULT_CURRICULUM_SELECTION, levelId: "basic-8", subjectId: "career-technology" };
    const { selection, clearedSubject, notice } = applyLevelChange(prev, "kg-1");
    expect(clearedSubject).toBe(true);
    expect(selection.subjectId).toBe("");
    expect(selection.levelId).toBe("kg-1");
    expect(notice).toContain("Career Technology is available for JHS / Common Core learners.");
  });

  it("keeps compatible subjects when the level changes within a band", () => {
    const prev = { ...DEFAULT_CURRICULUM_SELECTION, levelId: "basic-7", subjectId: "computing" };
    const { selection, clearedSubject } = applyLevelChange(prev, "basic-9");
    expect(clearedSubject).toBe(false);
    expect(selection.subjectId).toBe("computing");
  });

  it("resets level/subject when the curriculum changes to an incompatible one", () => {
    const prev = { ...DEFAULT_CURRICULUM_SELECTION, levelId: "basic-8", subjectId: "career-technology" };
    const { selection, notice } = applyCurriculumChange(prev, "gh-shs");
    expect(selection.levelId).toBe("");
    expect(selection.subjectId).toBe("");
    expect(notice).toContain("reset");
  });
});

describe("contextual teacher request placeholders", () => {
  it("matches the spec examples per subject", () => {
    expect(subjectPlaceholder("career-technology")).toContain(
      "Describe the class, strand, topic, lesson objective or activity you need"
    );
    expect(subjectPlaceholder("mathematics")).toContain(
      "Describe the class, topic, concept, difficulty level or exercise"
    );
    expect(subjectPlaceholder("english-language")).toContain(
      "Describe the class, topic, reading/writing skill or lesson objective"
    );
  });
});

describe("extra context fields", () => {
  it("keeps every optional context field from the spec", () => {
    const ids = EXTRA_CONTEXT_FIELDS.map((f) => f.id);
    for (const expected of [
      "classSize",
      "languagePreference",
      "learningDifficulties",
      "lessonDuration",
      "teachingResources",
      "schoolContext",
      "assessmentRequirements",
    ]) {
      expect(ids).toContain(expected);
    }
  });
});

describe("legacy compatibility (existing workflows keep working)", () => {
  it("resolves legacy subject ids to canonical subjects", () => {
    expect(resolveSubjectId("mathematics")).toBe("mathematics");
    expect(resolveSubjectId("english")).toBe("english-language");
    expect(resolveSubjectId("ict")).toBe("computing");
    expect(resolveSubjectId("coding")).toBe("computing");
    expect(resolveSubjectId("science")).toBe("science");
  });

  it("resolves legacy level ids to canonical levels", () => {
    expect(resolveLegacyLevelId("jhs-2")).toBe("basic-8");
    expect(resolveLegacyLevelId("jhs-1")).toBe("basic-7");
    expect(resolveLegacyLevelId("shs-3")).toBe("basic-12");
    expect(resolveLegacyLevelId("basic-8")).toBe("basic-8");
  });

  it("keeps every legacy subject resolvable in the bridged SUBJECTS list", () => {
    for (const id of [
      "mathematics",
      "english",
      "science",
      "social-studies",
      "ict",
      "coding",
      "robotics",
      "stem",
      "french",
      "biology",
      "chemistry",
      "physics",
      "economics",
      "geography",
      "history",
      "religious-moral",
      "creative-arts",
      "business",
    ]) {
      expect(SUBJECTS.some((s) => s.id === id)).toBe(true);
    }
  });

  it("keeps every legacy level in EDUCATION_LEVELS", () => {
    for (const id of ["kg", "primary", "jhs-1", "jhs-2", "jhs-3", "shs-1", "shs-2", "shs-3", "university"]) {
      expect(EDUCATION_LEVELS.some((l) => l.id === id)).toBe(true);
    }
  });
});

describe("curriculum-aware UI wiring", () => {
  it("tool panel consumes the dependent hierarchy with progressive disclosure", () => {
    const panel = read("web/components/gigalearn/GigaLearnToolPanel.tsx");
    expect(panel).toContain("CurriculumSelector");
    expect(panel).toContain("Your request");
    expect(panel).toContain("Learning objective");
    expect(panel).toContain("Extra context (optional)");
    expect(panel).not.toContain("EDUCATION_LEVELS.map");
    expect(panel).not.toContain("SUBJECTS.map");
  });

  it("homework panel consumes the dependent hierarchy", () => {
    const panel = read("web/components/gigalearn/GigaLearnHomeworkPanel.tsx");
    expect(panel).toContain("CurriculumSelector");
    expect(panel).not.toContain("EDUCATION_LEVELS.map");
  });

  it("generation hook and backend accept the full curriculum-aware payload", () => {
    expect(read("web/hooks/useGigaLearnGeneration.ts")).toContain("subStrand");
    expect(read("web/hooks/useGigaLearnGeneration.ts")).toContain("learningObjective");
    const backend = read("convex/gigalearnStudio.ts");
    for (const field of ["country", "grade", "strand", "subStrand", "topic", "learningObjective"]) {
      expect(backend).toContain(field);
    }
    expect(backend).toContain("Teacher request:");
  });

  it("creation studio keeps Career Technology and Computing with JHS-style levels", () => {
    const templates = read("web/lib/gigalearn/creation/templates.ts");
    expect(templates).toContain("Career Technology");
    expect(templates).toContain("Computing");
    expect(templates).toContain("Arabic");
    expect(templates).toContain("Basic 7 / JHS 1");
    expect(templates).toContain("Basic 10 / SHS 1");
  });
});
