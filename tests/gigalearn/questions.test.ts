import { describe, expect, it } from "vitest";
import {
  computePracticeScore,
  formatCorrectAnswer,
  getPracticeFallbackQuestions,
  gradeAnswer,
  isInteractivePracticeTool,
  parseQuestionsFromContent,
  parseQuestionsJsonBlock,
} from "../../web/lib/gigalearn/questions";

const SAMPLE_JSON = `
# Practice set

Some intro text.

\`\`\`json
{
  "questions": [
    {
      "id": "mars",
      "type": "mcq",
      "stem": "Which planet is known as the Red Planet?",
      "options": ["Venus", "Mars", "Jupiter", "Saturn"],
      "correctAnswer": "Mars",
      "explanation": "Mars looks red because of iron minerals on its surface."
    }
  ]
}
\`\`\`
`;

describe("GigaLearn question engine", () => {
  it("identifies interactive practice tools", () => {
    expect(isInteractivePracticeTool("practice-questions")).toBe(true);
    expect(isInteractivePracticeTool("lesson-notes")).toBe(false);
  });

  it("parses structured JSON question blocks", () => {
    const questions = parseQuestionsJsonBlock(SAMPLE_JSON);
    expect(questions).toHaveLength(1);
    expect(questions[0].stem).toContain("Red Planet");
    expect(questions[0].explanation).toContain("iron");
  });

  it("prefers JSON over markdown when both present", () => {
    const questions = parseQuestionsFromContent(SAMPLE_JSON);
    expect(questions[0].id).toBe("mars");
  });

  it("grades mcq answers by option letter or text", () => {
    const q = {
      id: "div",
      type: "mcq" as const,
      stem: "12 ÷ 3 = ?",
      options: ["3", "4", "5", "6"],
      correctAnswer: "4",
      explanation: "12 divided by 3 equals 4.",
    };
    expect(gradeAnswer(q, "b").correct).toBe(true);
    expect(gradeAnswer(q, "4").correct).toBe(true);
    expect(gradeAnswer(q, "a").correct).toBe(false);
  });

  it("formats correct answers for feedback", () => {
    const q = {
      id: "x",
      type: "mcq" as const,
      stem: "Test",
      options: ["3", "4", "5", "6"],
      correctAnswer: "b",
      explanation: "Because.",
    };
    expect(formatCorrectAnswer(q)).toBe("4");
  });

  it("computes practice score percentage", () => {
    expect(
      computePracticeScore([{ correct: true }, { correct: false }, { correct: true }])
    ).toBe(67);
  });

  it("provides KG visual basket fallback", () => {
    const kg = getPracticeFallbackQuestions("kg", "mathematics");
    expect(kg[0].options?.[0]).toContain("🍎");
    expect(gradeAnswer(kg[0], "a").correct).toBe(true);
  });

  it("provides Primary contextual Ama example", () => {
    const primary = getPracticeFallbackQuestions("primary", "mathematics");
    expect(primary[0].stem).toContain("Ama");
    expect(gradeAnswer(primary[0], "b").correct).toBe(true);
  });

  it("provides JHS reasoning with African context", () => {
    const jhs = getPracticeFallbackQuestions("jhs-2", "science");
    expect(jhs[0].stem).toContain("Ghanaian");
    expect(jhs[1]?.stem).toContain("cocoa");
  });

  it("provides SHS STEM fallback", () => {
    const shs = getPracticeFallbackQuestions("shs-2", "physics");
    expect(shs[0].learningObjective).toContain("Engineering");
  });

  it("provides coding and robotics fallbacks", () => {
    const coding = getPracticeFallbackQuestions("jhs-2", "coding");
    expect(coding[0].type).toBe("ordering");
    const robotics = getPracticeFallbackQuestions("jhs-2", "robotics");
    expect(robotics[0].topic).toBe("robotics");
  });
});
