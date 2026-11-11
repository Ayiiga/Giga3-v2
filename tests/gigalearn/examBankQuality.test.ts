import { describe, expect, it } from "vitest";
import { getTechBankQuestionById, getTechBankQuestions } from "../../web/lib/gigalearn/academy/techBanks/techBankServer";
import { examQuestionKey } from "../../web/lib/gigalearn/examPractice/examQuestionQuality";

describe("BECE and WASSCE question quality", () => {
  const courses = ["exam-bece-prep", "exam-wassce-english", "exam-wassce-core-mathematics", "exam-wassce-integrated-science", "exam-wassce-social-studies"];

  it.each(courses)("deduplicates new %s practice and validates objective options", (course) => {
    const questions = getTechBankQuestions(course, { questionType: "mcq" });
    expect(questions.length).toBeGreaterThan(0);
    expect(new Set(questions.map(examQuestionKey)).size).toBe(questions.length);
    for (const item of questions) {
      expect(item.courseSlug).toBe(course);
      expect(item.options).toHaveLength(4);
      expect(item.questionText).not.toMatch(/^Which statement best explains the concept in this question:/);
      expect(item.correctIndex).toBeGreaterThanOrEqual(0);
      expect(item.correctIndex).toBeLessThan(4);
    }
  });

  it("covers the five BECE Science strands and preserves historical question IDs", () => {
    const questions = getTechBankQuestions("exam-bece-prep", { topicId: "integrated-science", questionType: "mcq" });
    expect(questions).toHaveLength(20);
    expect(new Set(questions.map((q) => q.curriculumStrand)).size).toBe(5);
    expect(new Set(questions.map((q) => q.curriculumSubStrand)).size).toBe(20);
    expect(getTechBankQuestionById("exam-bece-prep", "exam-bece-prep-q107")).toBeDefined();
  });
});
