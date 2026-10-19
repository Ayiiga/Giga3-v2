import type { ExamPracticeOptionId, ExamPracticeQuestion } from "./types";

export type QuizAnswerMap = Record<string, ExamPracticeOptionId | undefined>;

export function scoreQuiz(
  questions: readonly ExamPracticeQuestion[],
  answers: QuizAnswerMap
): { correct: number; answered: number; total: number; percent: number } {
  let correct = 0;
  let answered = 0;
  for (const q of questions) {
    const a = answers[q.id];
    if (a) {
      answered += 1;
      if (a === q.correct) correct += 1;
    }
  }
  const total = questions.length;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { correct, answered, total, percent };
}

export function optionIds(): ExamPracticeOptionId[] {
  return ["A", "B", "C", "D"];
}
