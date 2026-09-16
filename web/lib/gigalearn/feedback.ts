import type { AgeBand } from "@/lib/gigalearn/ageUi";

export type AnswerFeedback = {
  title: string;
  subtitle: string;
  showTryAgain: boolean;
};

export function correctFeedback(band: AgeBand): AnswerFeedback {
  switch (band) {
    case "kg":
      return {
        title: "✓ Great job!",
        subtitle: "You got it right!",
        showTryAgain: false,
      };
    case "primary":
      return {
        title: "✓ Correct!",
        subtitle: "Well done — keep going!",
        showTryAgain: false,
      };
    default:
      return {
        title: "✓ Correct!",
        subtitle: "Nice work. Read why below.",
        showTryAgain: false,
      };
  }
}

export function incorrectFeedback(band: AgeBand): AnswerFeedback {
  switch (band) {
    case "kg":
      return {
        title: "Let's learn together",
        subtitle: "Not quite — here's the answer.",
        showTryAgain: true,
      };
    case "primary":
      return {
        title: "Not quite. Let's learn why.",
        subtitle: "Check the correct answer and explanation.",
        showTryAgain: true,
      };
    default:
      return {
        title: "Not quite. Let's learn why.",
        subtitle: "Review the explanation, then continue.",
        showTryAgain: true,
      };
  }
}
