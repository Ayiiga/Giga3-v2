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

  it("provides KG fallback with visual counting", () => {
    const kg = getPracticeFallbackQuestions("kg", "mathematics");
    expect(kg[0].visualCue).toContain("🍎");
    expect(gradeAnswer(kg[0], "c").correct).toBe(true);
  });

  it("provides JHS science fallback with explanation-first framing", () => {
    const jhs = getPracticeFallbackQuestions("jhs-2", "science");
    expect(jhs[0].explanation.length).toBeGreaterThan(20);
  });
});
