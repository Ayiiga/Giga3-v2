/** @vitest-environment happy-dom */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { analyzeError } from "../../web/lib/gigalearn/errorAnalysis";
import { difficultyForMastery, stepDifficulty } from "../../web/lib/gigalearn/adaptiveQuestions";
import { aiStudioImageUrl, shortVideoScript, socialGraphicUrl } from "../../web/lib/gigalearn/ecosystem";
import { computeMastery, weakTopicMessage } from "../../web/lib/gigalearn/mastery";
import {
  buildLearningPath,
  nextActivity,
  recommendFor,
} from "../../web/lib/gigalearn/recommendations";
import {
  collectKnownTopics,
  groupRevisionTopics,
  spacedBuckets,
} from "../../web/lib/gigalearn/revision";
import { filterSignals, getSignals, logSignal, signalTopicKey } from "../../web/lib/gigalearn/signals";
import {
  checkCombination,
  getSubjectsForLevel,
} from "../../web/lib/gigalearn/curriculumEngine";
import {
  getStudioContext,
  saveStudioContext,
  studioContextIds,
  validateStudioContext,
} from "../../web/lib/gigalearn/studioContext";
import { getStudioTool } from "../../web/lib/gigalearn/studioTools";
import { GIGALEARN_SECTIONS } from "../../web/lib/gigalearn/sections";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

beforeEach(() => {
  localStorage.clear();
});

function seedSignals() {
  const base = {
    subjectId: "mathematics",
    levelId: "basic-8",
    gradeId: "JHS 2",
    strand: "Algebra",
    subStrand: "",
    topic: "Topic X",
    indicator: "",
    detail: "",
  };
  for (let i = 0; i < 5; i++) {
    logSignal({ ...base, type: "quiz", score: 90, correct: true });
  }
  return base;
}

describe("Phase 3 mastery engine", () => {
  it("starts at not-started with no evidence", () => {
    const m = computeMastery(
      { subjectId: "mathematics", levelId: "basic-8", strand: "Algebra", subStrand: "", topic: "Topic X", indicator: "" },
      { signals: [] }
    );
    expect(m.state).toBe("not-started");
    expect(m.needsMoreEvidence).toBe(true);
  });

  it("never masters from a single question", () => {
    const signals = [
      logSignal({
        subjectId: "mathematics", levelId: "basic-8", gradeId: "JHS 2",
        strand: "Algebra", subStrand: "", topic: "Topic X", indicator: "",
        type: "quiz", score: 100, correct: true, detail: "",
      }),
    ];
    const m = computeMastery(
      { subjectId: "mathematics", levelId: "basic-8", strand: "Algebra", subStrand: "", topic: "Topic X", indicator: "" },
      { signals }
    );
    expect(m.state).not.toBe("mastered");
    expect(m.state).not.toBe("proficient");
  });

  it("reaches mastered only after sustained correct performance", () => {
    const base = seedSignals();
    const m = computeMastery(
      { subjectId: base.subjectId, levelId: base.levelId, strand: base.strand, subStrand: "", topic: base.topic, indicator: "" },
      { signals: filterSignals(getSignals(), {}) }
    );
    expect(m.attempts).toBeGreaterThanOrEqual(5);
    expect(m.state).toBe("mastered");
  });

  it("regresses on poor recent evidence and uses cautious language", () => {
    seedSignals();
    for (let i = 0; i < 3; i++) {
      logSignal({
        subjectId: "mathematics", levelId: "basic-8", gradeId: "JHS 2",
        strand: "Algebra", subStrand: "", topic: "Topic X", indicator: "",
        type: "quiz", score: 20, correct: false, detail: "",
      });
    }
    const m = computeMastery(
      { subjectId: "mathematics", levelId: "basic-8", strand: "Algebra", subStrand: "", topic: "Topic X", indicator: "" }
    );
    expect(["learning", "developing"]).toContain(m.state);
    expect(weakTopicMessage("Topic X")).toMatch(/may need more review/);
  });
});

describe("Phase 3 recommendations are explainable", () => {
  const scope = {
    subjectId: "mathematics", levelId: "basic-8", strand: "Algebra",
    subStrand: "", topic: "Topic X", indicator: "", label: "Topic X",
  };
  it("suggests challenge after 4/5 correct with a reason", () => {
    const rec = recommendFor({ ...scope, recentCorrect: 4, recentTotal: 5, mistakes: 0 });
    expect(rec?.kind).toBe("ready-for");
    expect(rec?.reason).toMatch(/4 of your last 5/);
  });
  it("suggests review-first after repeated mistakes with a reason", () => {
    const rec = recommendFor({ ...scope, recentCorrect: 1, recentTotal: 5, mistakes: 3 });
    expect(rec?.kind).toBe("review-first");
    expect(rec?.reason).toMatch(/may need more review/);
  });
  it("builds an unlockable 7-step learning path", () => {
    const path = buildLearningPath("Topic X", true);
    expect(path).toHaveLength(7);
    expect(path[0]?.label).toMatch(/Review/);
    expect(path[path.length - 1]?.detail).toMatch(/nothing is locked/i);
  });
  it("nextActivity prefers review-first topics", () => {
    const next = nextActivity([
      { ...scope, recentCorrect: 0, recentTotal: 0, mistakes: 3, isNextInSequence: false },
      { ...scope, topic: "Topic Y", label: "Topic Y", recentCorrect: 0, recentTotal: 0, mistakes: 0, isNextInSequence: true },
    ]);
    expect(next?.kind).toBe("review-first");
  });
});

describe("Phase 3 error analysis is conservative", () => {
  it("flags arithmetic slips only with numeric evidence", () => {
    const r = analyzeError({
      question: "What is 12 + 7?",
      studentAnswer: "12 + 7 = 15",
      correctAnswer: "19",
    });
    expect(r.category).toBe("calculation-error");
  });
  it("returns unknown when evidence is insufficient", () => {
    const r = analyzeError({ question: "Explain photosynthesis.", studentAnswer: "It is about plants and stuff." });
    expect(r.category).toBe("unknown");
    expect(r.label).toMatch(/Not enough information/);
  });
});

describe("Phase 3 revision + spaced review stay manageable", () => {
  it("groups review-now from miss history and caps groups at 5", () => {
    for (let i = 0; i < 3; i++) {
      logSignal({
        subjectId: "mathematics", levelId: "basic-8", gradeId: "JHS 2",
        strand: "Algebra", subStrand: "", topic: "Topic X", indicator: "",
        type: "quiz", score: 30, correct: false, detail: "",
      });
    }
    const topics = collectKnownTopics(getSignals());
    expect(topics.length).toBeGreaterThan(0);
    const groups = groupRevisionTopics(topics, { signals: getSignals() });
    expect(groups.reviewNow.length).toBeGreaterThan(0);
    for (const g of Object.values(groups)) expect(g.length).toBeLessThanOrEqual(5);
    expect(signalTopicKey(getSignals()[0]!)).toContain("mathematics");
  });
  it("buckets spaced review without flooding", () => {
    const buckets = spacedBuckets(
      [{ deckId: "d1", total: 10, lastReviewedAt: Date.now() - 10 * 24 * 60 * 60 * 1000 }],
      getSignals()
    );
    expect(buckets.dueForReview.length).toBeLessThanOrEqual(5);
    expect(buckets.recentlyMissed.length).toBeLessThanOrEqual(5);
  });
});

describe("Phase 3 adaptive questions", () => {
  it("maps mastery to conservative difficulty and steps one at a time", () => {
    const m = computeMastery(
      { subjectId: "x", levelId: "basic-8", strand: "s", subStrand: "", topic: "t", indicator: "" },
      { signals: [] }
    );
    expect(difficultyForMastery(m)).toBe("foundational");
    expect(stepDifficulty("standard", false)).toBe("developing");
    expect(stepDifficulty("standard", true, 2)).toBe("challenging");
    expect(stepDifficulty("standard", true, 1)).toBe("standard");
  });
});

describe("Phase 3 ecosystem reuses existing systems", () => {
  it("links images via Media Studio and scripts via teleprompter handoff", () => {
    expect(aiStudioImageUrl("Fractions", "Mathematics", "JHS 2")).toMatch(/^\/media\?/);
    expect(socialGraphicUrl("Quiz results")).toMatch(/^\/media\?/);
    const script = shortVideoScript("# Title\nFractions help share food fairly. Practice halves and quarters daily with family examples.", "Fractions");
    expect(script).toMatch(/Quick revision/);
    const src = read("web/components/gigalearn/ResourceLibrary.tsx");
    expect(src).toContain("saveTeleprompterScript");
    expect(src).toContain("/gigaedit");
  });
});

describe("Phase 3 tutor prompts keep curriculum context + safety", () => {
  it("adaptiveLearning module carries stable IDs, Socratic mode and Career-Tech safety", () => {
    const src = read("convex/adaptiveLearning.ts");
    for (const id of ["countryId", "curriculumId", "educationLevelId", "subjectId"]) {
      expect(src).toContain(id);
    }
    expect(src).toContain("socratic");
    expect(src).toContain("Never encourage unsafe practical experimentation");
    expect(src).toContain("TUTOR_MODES");
  });
  it("marking identifies AI assistance and keeps teacher authority", () => {
    const src = read("convex/adaptiveLearning.ts");
    expect(src).toMatch(/AI marking assistance/i);
    expect(src).toMatch(/teacher makes official assessment decisions/i);
    expect(src).toContain("errorCategory");
  });
  it("AdaptiveTutor exposes 8 actions + Socratic switch", () => {
    const src = read("web/components/gigalearn/AdaptiveTutor.tsx");
    for (const action of ["Explain", "Simplify", "Example", "Hint", "Check me", "Practice", "Correct me", "Challenge"]) {
      expect(src).toContain(action);
    }
    expect(src).toContain("Socratic mode");
    expect(src).toContain("performanceSummaryForTutor");
  });
  it("new tabs are additive and reuse existing design", () => {
    const ids = GIGALEARN_SECTIONS.map((s) => s.id);
    for (const id of ["studio", "learn", "library", "tutor", "my-learning", "revision", "insights"]) {
      expect(ids).toContain(id);
    }
    const client = read("web/components/gigalearn/GigaLearnClient.tsx");
    expect(client).toContain("AdaptiveTutor");
    expect(client).toContain("StudentDashboard");
    expect(client).toContain("RevisionCenter");
    expect(client).toContain("TeacherInsights");
  });
});

describe("Phase 3 privacy: no cross-learner endpoints", () => {
  it("adaptiveLearning exposes only own-session actions", () => {
    const src = read("convex/adaptiveLearning.ts");
    expect(src).toContain("tutorTurn");
    expect(src).toContain("markAnswer");
    expect(src).not.toMatch(/getStudentPerformance|listStudents|getClassAnalytics|query\(/);
    expect(src).toMatch(/caller's own session only/);
  });
});

describe("Phase 3 regression: PR #441 + #442 foundations intact", () => {
  it("curriculum context stays correct, IDs stable, invalid combos rejected", () => {
    expect(getSubjectsForLevel("basic-8").some((s) => s.id === "mathematics")).toBe(true);
    expect(checkCombination("kg-1", "career-technology").valid).toBe(false);
    const ctx = getStudioContext();
    expect(validateStudioContext(ctx).valid).toBe(true);
    saveStudioContext({ levelId: "basic-8", subjectId: "mathematics", topic: "Fractions" });
    const ids = studioContextIds(getStudioContext());
    expect(ids.subjectId).toBe("mathematics");
    expect(ids.topic).toBe("Fractions");
  });
  it("Phase 2 studio registry, safety and practice labeling untouched", () => {
    expect(getStudioTool("lesson-generator")).toBeTruthy();
    expect(getStudioTool("bece-mock")).toBeTruthy();
    const src = read("convex/gigalearnStudio.ts");
    expect(src).toMatch(/safety|supervis/i);
    expect(src).toMatch(/AI-generated practice question/i);
  });
});
