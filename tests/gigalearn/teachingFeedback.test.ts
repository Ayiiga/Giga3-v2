import { describe, expect, it } from "vitest";
import { buildTeachingFeedback } from "../../web/lib/gigalearn/teachingFeedback";

const baseQuestion = {
  id: "q1",
  type: "mcq" as const,
  stem: "12 ÷ 3 = ?",
  options: ["3", "4", "5", "6"],
  correctAnswer: "4",
  explanation: "12 divided by 3 equals 4 because we share equally.",
  learningObjective: "Division as equal sharing",
};

describe("GigaLearn teaching feedback", () => {
  it("shows Great job for correct KG answers", () => {
    const fb = buildTeachingFeedback(baseQuestion, "kg", true, "b");
    expect(fb.headline).toContain("Great job");
    expect(fb.whyCorrect).toBeTruthy();
  });

  it("shows Not quite for incorrect JHS answers", () => {
    const fb = buildTeachingFeedback(baseQuestion, "jhs", false, "a");
    expect(fb.headline).toContain("Not quite");
    expect(fb.correctAnswer).toBe("4");
    expect(fb.whyYourAnswerMightBeWrong).toBeTruthy();
  });

  it("includes concept to remember when available", () => {
    const fb = buildTeachingFeedback(baseQuestion, "primary", true, "4");
    expect(fb.conceptToRemember).toContain("Division");
  });
});
