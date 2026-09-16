import { describe, expect, it } from "vitest";
import {
  positiveWeakTopicLabel,
  selectQuestionsForWeakTopics,
  weakTopicPracticeHeadline,
} from "../../web/lib/gigalearn/practiceRecommendations";
import type { GigaLearnQuestion } from "../../web/lib/gigalearn/questions";

const questions: GigaLearnQuestion[] = [
  {
    id: "a",
    type: "mcq",
    stem: "Fractions",
    options: ["1", "2"],
    correctAnswer: "1",
    explanation: "Because.",
    topic: "fractions",
  },
  {
    id: "b",
    type: "mcq",
    stem: "Water cycle",
    options: ["1", "2"],
    correctAnswer: "1",
    explanation: "Because.",
    topic: "science",
  },
];

describe("GigaLearn practice recommendations", () => {
  it("uses positive language for weak topics", () => {
    expect(positiveWeakTopicLabel("mathematics/fractions")).toBe("Mathematics · fractions");
    expect(weakTopicPracticeHeadline({ topicKey: "math", label: "fractions" })).toContain(
      "strengthen"
    );
  });

  it("selects questions matching weak topic hints without AI", () => {
    const picked = selectQuestionsForWeakTopics(questions, [
      { topicKey: "math/fractions", label: "fractions" },
    ]);
    expect(picked.map((q) => q.id)).toContain("a");
  });
});
