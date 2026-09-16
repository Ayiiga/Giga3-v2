import type { AgeBand } from "@/lib/gigalearn/ageUi";
import { correctFeedback, incorrectFeedback } from "@/lib/gigalearn/feedback";
import type { GigaLearnQuestion } from "@/lib/gigalearn/questions";
import { formatCorrectAnswer, resolveSelectedAnswerText } from "@/lib/gigalearn/questions";

export type TeachingFeedback = {
  headline: string;
  subtitle: string;
  correctAnswer: string;
  whyCorrect: string;
  whyYourAnswerMightBeWrong?: string;
  conceptToRemember?: string;
};

function shortenForBand(text: string, band: AgeBand, maxLen: number): string {
  if (band === "kg" || band === "primary") {
    const first = text.split(/[.!?]/)[0]?.trim();
    const short = first && first.length < text.length ? first : text;
    return short.length > maxLen ? `${short.slice(0, maxLen - 1)}…` : short;
  }
  return text;
}

function guessWhyWrong(
  question: GigaLearnQuestion,
  selectedText: string,
  correctText: string
): string | undefined {
  if (question.whyIncorrect?.trim()) return question.whyIncorrect.trim();

  const selected = selectedText.toLowerCase();
  const correct = correctText.toLowerCase();
  if (!selected || selected === correct) return undefined;

  if (question.type === "ordering") {
    return "Some steps were out of order. Think about what must happen first.";
  }

  if (question.options?.length) {
    const numeric = selected.match(/\d+/);
    const correctNum = correct.match(/\d+/)?.[0];
    if (numeric && correctNum && numeric[0] !== correctNum) {
      return `You chose ${selectedText}. Check the numbers carefully — the correct value is ${correctText}.`;
    }
  }

  return `You chose "${selectedText}". Compare it with the correct answer and look for the key idea in the explanation.`;
}

export function buildTeachingFeedback(
  question: GigaLearnQuestion,
  ageBand: AgeBand,
  correct: boolean,
  userAnswer: string | string[]
): TeachingFeedback {
  const headline = correct
    ? correctFeedback(ageBand).title
    : incorrectFeedback(ageBand).title;
  const subtitle = correct
    ? correctFeedback(ageBand).subtitle
    : incorrectFeedback(ageBand).subtitle;

  const correctAnswer = formatCorrectAnswer(question);
  const selectedText = resolveSelectedAnswerText(question, userAnswer);
  const whyCorrect = shortenForBand(
    question.explanation || `The answer is ${correctAnswer}.`,
    ageBand,
    ageBand === "kg" ? 80 : ageBand === "primary" ? 140 : 400
  );

  const concept =
    question.learningObjective?.trim() ||
    question.concept?.trim() ||
    question.topic?.trim();

  if (correct) {
    return {
      headline,
      subtitle,
      correctAnswer,
      whyCorrect,
      conceptToRemember: concept
        ? shortenForBand(`Remember: ${concept}`, ageBand, 120)
        : undefined,
    };
  }

  return {
    headline,
    subtitle,
    correctAnswer,
    whyCorrect,
    whyYourAnswerMightBeWrong: shortenForBand(
      guessWhyWrong(question, selectedText, correctAnswer) ?? "",
      ageBand,
      ageBand === "kg" ? 60 : 200
    ),
    conceptToRemember: concept
      ? shortenForBand(`Focus on: ${concept}`, ageBand, 120)
      : undefined,
  };
}
