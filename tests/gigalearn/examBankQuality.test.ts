import { describe, expect, it } from "vitest";
import { getTechBankQuestionById, getTechBankQuestions, gradeTechAnswers } from "../../web/lib/gigalearn/academy/techBanks/techBankServer";
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

  it("retires malformed and miskeyed items from new sessions without losing their IDs", () => {
    const retired = [
      ["exam-bece-prep", "exam-bece-prep-q268"],
      ["exam-bece-prep", "exam-bece-prep-q423"],
      ["exam-wassce-integrated-science", "exam-wassce-integrated-science-q108"],
      ["exam-wassce-integrated-science", "exam-wassce-integrated-science-q139"],
    ];
    for (const [course, id] of retired) {
      expect(getTechBankQuestions(course).some((q) => q.questionId === id)).toBe(false);
      expect(getTechBankQuestionById(course, id)).toBeDefined();
    }
  });

  it("removes superficial Social Studies wrappers before selecting distinct stems", () => {
    const questions = getTechBankQuestions("exam-wassce-social-studies");
    const stems = questions.map((q) => q.questionText.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());
    expect(new Set(stems).size).toBe(questions.length);
    expect(questions.every((q) => !/^(A district planning team receives a report that|An assembly member is asked to explain why)/i.test(q.questionText))).toBe(true);
  });

  it("scores reviewed BECE Science keys after shuffling the choices", () => {
    const courseSlug = "exam-bece-prep";
    const items = getTechBankQuestions(courseSlug, { topicId: "integrated-science", questionType: "mcq" });
    const questionIds = items.map((q) => q.questionId);
    const grade = gradeTechAnswers({
      courseSlug,
      questionIds,
      answers: Object.fromEntries(questionIds.map((id, index) => [id, index === 0 ? 0 : 2])),
      optionPermutations: Object.fromEntries(questionIds.map((id) => [id, [1, 2, 0, 3]])),
    });

    expect(grade.maxScore).toBe(27);
    expect(grade.score).toBe(26);
    expect(grade.results[0]).toMatchObject({ correct: false, correctIndex: 2, scored: true });
    expect(grade.results[1]).toMatchObject({ correct: true, correctIndex: 2, scored: true });
  });

  it("covers the five BECE Science strands and preserves historical question IDs", () => {
    const questions = getTechBankQuestions("exam-bece-prep", { topicId: "integrated-science", questionType: "mcq" });
    expect(questions).toHaveLength(27);
    expect(new Set(questions.map((q) => q.curriculumStrand)).size).toBe(5);
    expect(new Set(questions.map((q) => q.curriculumSubStrand)).size).toBe(20);
    expect(getTechBankQuestionById("exam-bece-prep", "exam-bece-prep-q107")).toBeDefined();
  });
});
