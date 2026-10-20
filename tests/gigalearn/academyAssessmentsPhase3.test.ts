/**
 * GigaLearn Academy Phase 3 — assessments, grading, progression.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assessmentIsUnlocked,
  getBuiltinAssessment,
  gradeObjectiveSubmission,
  listBuiltinAssessmentsForCourse,
  toPublicAssessmentQuestions,
  unlockedModuleIds,
} from "../../web/lib/gigalearn/academy/assessmentCatalog";
import { gradeAnswer } from "../../web/lib/gigalearn/questions";
import { GIGALEARN_PRIMARY_AREAS } from "../../web/lib/gigalearn/sections";

const ROOT = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

describe("Academy Phase 3 assessment catalogue + objective grading", () => {
  it("ships course-specific assessments with thresholds and attempt limits", () => {
    const list = listBuiltinAssessmentsForCourse("bece-maths-foundations");
    expect(list.length).toBeGreaterThanOrEqual(3);
    const m1 = getBuiltinAssessment("bece-maths-foundations", "bece-maths-m1-quiz")!;
    expect(m1.passThreshold).toBe(70);
    expect(m1.maxAttempts).toBe(3);
    expect(m1.gradingMode).toBe("objective");
    expect(m1.questions.every((q) => q.type && q.stem && q.correctAnswer != null)).toBe(true);
  });

  it("grades objective answers server-side via gradeAnswer (no client score trust)", () => {
    const m1 = getBuiltinAssessment("bece-maths-foundations", "bece-maths-m1-quiz")!;
    const perfect = gradeObjectiveSubmission(m1, {
      q1: "1",
      q2: "true",
      q3: "18",
    });
    expect(perfect.score).toBe(100);
    expect(perfect.passed).toBe(true);

    const fail = gradeObjectiveSubmission(m1, {
      q1: "1/2",
      q2: "false",
      q3: "14",
    });
    expect(fail.passed).toBe(false);
    expect(fail.score).toBeLessThan(m1.passThreshold);

    // Reuse existing gradeAnswer directly for MCQ letter selection.
    const q = m1.questions[0]!;
    expect(gradeAnswer(q, "1").correct).toBe(true);
  });

  it("strips protected answer keys from public question payloads", () => {
    const fin = getBuiltinAssessment("bece-maths-foundations", "bece-maths-final")!;
    expect(fin.protectedFinal).toBe(true);
    const pub = toPublicAssessmentQuestions(fin.questions, {
      includeKeys: true,
      protectedFinal: true,
    });
    expect(pub.every((q) => q.correctAnswer === undefined)).toBe(true);
    expect(pub.every((q) => q.explanation === undefined)).toBe(true);
  });

  it("enforces progression prerequisites and module gates", () => {
    const defs = listBuiltinAssessmentsForCourse("bece-maths-foundations");
    const m2 = getBuiltinAssessment("bece-maths-foundations", "bece-maths-m2-quiz")!;
    expect(assessmentIsUnlocked(m2, new Set())).toBe(false);
    expect(assessmentIsUnlocked(m2, new Set(["bece-maths-m1-quiz"]))).toBe(true);

    const unlockedNone = unlockedModuleIds(
      ["m1-numbers", "m2-algebra", "m3-revision"],
      defs,
      new Set()
    );
    expect(unlockedNone).toContain("m1-numbers");
    expect(unlockedNone).not.toContain("m2-algebra");

    const unlockedAfterM1 = unlockedModuleIds(
      ["m1-numbers", "m2-algebra", "m3-revision"],
      defs,
      new Set(["bece-maths-m1-quiz"])
    );
    expect(unlockedAfterM1).toContain("m2-algebra");
  });

  it("supports ai_assisted and instructor_review modes without a second question engine", () => {
    const eng = getBuiltinAssessment("wassce-english-writing", "wassce-english-m1-quiz")!;
    expect(eng.gradingMode).toBe("ai_assisted");
    const graded = gradeObjectiveSubmission(eng, {
      q1: "A clear thesis / controlling idea",
      q2: "true",
      q3: "Intro, body, conclusion with examples.",
    });
    expect(graded.subjectiveQuestionIds).toContain("q3");
    expect(graded.objectiveQuestionIds).toContain("q1");

    const review = getBuiltinAssessment("teacher-lesson-studio-basics", "teacher-studio-review")!;
    expect(review.gradingMode).toBe("instructor_review");
  });
});

describe("Academy Phase 3 backend + UI contracts", () => {
  it("adds attempts table and assessment module with security controls", () => {
    const schema = read("convex/schema.ts");
    expect(schema).toContain("gigaLearnAcademyAttempts: defineTable");
    expect(schema).toContain('.index("by_idempotency"');
    expect(schema).toContain("gigaLearnProgress: defineTable");

    const src = read("convex/gigaLearnAcademyAssessments.ts");
    expect(src).toMatch(/export const submitAssessmentAttempt\s*=\s*mutation/);
    expect(src).toMatch(/export const runAiAssistedAssessmentFeedback\s*=\s*action/);
    expect(src).toMatch(/export const instructorReviewAttempt\s*=\s*mutation/);
    expect(src).toContain("gradeObjectiveSubmission");
    expect(src).toContain("adaptiveLearning.markAnswer");
    expect(src).toContain("idempotencyKey");
    expect(src).toContain("No attempts remaining");
    expect(src).toContain("Enrolment required");
    expect(src).not.toMatch(/gigaLearnProgress\.(recordAssessment|recordPractice)/);
    // No in-process code execution sandbox.
    expect(src).not.toMatch(/eval\(|new Function\(|child_process|vm\.runIn/);
  });

  it("wires assess route and mobile-friendly panel", () => {
    expect(
      existsSync(resolve(ROOT, "web/app/(marketing)/gigalearn/academy/assess/page.tsx"))
    ).toBe(true);
    const panel = read("web/components/gigalearn/academy/AcademyAssessmentPanel.tsx");
    expect(panel).toContain("min-h-11");
    expect(panel).toContain("Submit for grading");
    expect(panel).toContain("Attempt history");
    expect(panel).toContain("submitAssessmentAttempt");
    // Submit payload: answers + idempotency only — no client-authored official score.
    const submitCall = panel.match(
      /await submit\(\{([\s\S]*?)\}\);/
    )?.[1];
    expect(submitCall).toBeTruthy();
    expect(submitCall).toContain("answersJson");
    expect(submitCall).toContain("idempotencyKey");
    expect(submitCall).not.toMatch(/\bscore\b/);
    expect(submitCall).not.toMatch(/\bpassed\b/);
    expect(panel).toContain("answersJson");

    const detail = read("web/components/gigalearn/academy/AcademyCourseDetail.tsx");
    expect(detail).toContain("/gigalearn/academy/assess/");
  });

  it("rejects client score fields on submitAssessmentAttempt args", () => {
    const src = read("convex/gigaLearnAcademyAssessments.ts");
    const submitBlock = src.slice(
      src.indexOf("export const submitAssessmentAttempt"),
      src.indexOf("export const runAiAssistedAssessmentFeedback")
    );
    expect(submitBlock).toContain("answersJson: v.string()");
    expect(submitBlock).toContain("idempotencyKey: v.string()");
    expect(submitBlock).not.toMatch(/args:\s*\{[\s\S]*?\bscore:\s*v\./);
    expect(submitBlock).not.toMatch(/args:\s*\{[\s\S]*?\bpassed:\s*v\./);
    expect(submitBlock).toContain("duplicate: true");
  });

  it("preserves six hubs, practice grading, and offline sync entry points", () => {
    expect(GIGALEARN_PRIMARY_AREAS).toHaveLength(6);
    expect(existsSync(resolve(ROOT, "web/lib/gigalearn/questions.ts"))).toBe(true);
    expect(existsSync(resolve(ROOT, "web/components/gigalearn/PracticeSession.tsx"))).toBe(true);
    expect(existsSync(resolve(ROOT, "web/lib/gigalearn/offlineProgressQueue.ts"))).toBe(true);
    const adaptive = read("convex/adaptiveLearning.ts");
    expect(adaptive).toMatch(/export const markAnswer\s*=\s*action/);
    expect(adaptive).toMatch(/export const tutorTurn\s*=\s*action/);
  });
});
