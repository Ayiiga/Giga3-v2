/**
 * Structured question templates for GigaLearn interactive practice.
 * Compatible with AI markdown + optional JSON block output.
 */

export type GigaLearnQuestionType =
  | "mcq"
  | "true_false"
  | "short_answer"
  | "fill_blank"
  | "ordering"
  | "matching"
  | "poll";

export type GigaLearnQuestion = {
  id: string;
  type: GigaLearnQuestionType;
  stem: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  hint?: string;
  difficulty?: "easy" | "medium" | "hard";
  learningObjective?: string;
  points?: number;
  estimatedSec?: number;
  /** Emoji/visual cue for early learners (e.g. "🍎 🍎 🍎") */
  visualCue?: string;
  topic?: string;
  subtopic?: string;
  /** Concept the learner should remember */
  concept?: string;
  /** Optional note on why a common wrong choice is tempting */
  whyIncorrect?: string;
};

export const INTERACTIVE_PRACTICE_TOOL_IDS = new Set([
  "quiz-generator",
  "practice-questions",
  "exam-prep",
  "revision-guide",
]);

export function isInteractivePracticeTool(toolId: string): boolean {
  return INTERACTIVE_PRACTICE_TOOL_IDS.has(toolId);
}

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function slugId(text: string, index: number): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return base ? `q_${base}_${index}` : `q_${index + 1}`;
}

function coerceQuestion(raw: Record<string, unknown>, index: number): GigaLearnQuestion | null {
  const stem = String(raw.stem ?? raw.question ?? raw.text ?? "").trim();
  if (!stem) return null;

  const type = (raw.type as GigaLearnQuestionType) || "mcq";
  const options = Array.isArray(raw.options)
    ? raw.options.map((o) => String(o).trim()).filter(Boolean)
    : undefined;

  let correctAnswer: string | string[];
  if (Array.isArray(raw.correctAnswer)) {
    correctAnswer = raw.correctAnswer.map((a) => String(a).trim()).filter(Boolean);
  } else {
    correctAnswer = String(raw.correctAnswer ?? raw.answer ?? "").trim();
  }
  if (!correctAnswer || (Array.isArray(correctAnswer) && !correctAnswer.length)) {
    return null;
  }

  const explanation = String(
    raw.explanation ?? raw.why ?? "Review the concept and try the next question."
  ).trim();

  return {
    id: String(raw.id ?? slugId(stem, index)),
    type,
    stem,
    options,
    correctAnswer,
    explanation,
    hint: raw.hint ? String(raw.hint).trim() : undefined,
    difficulty: raw.difficulty as GigaLearnQuestion["difficulty"],
    learningObjective: raw.learningObjective
      ? String(raw.learningObjective).trim()
      : undefined,
    points: typeof raw.points === "number" ? raw.points : 1,
    estimatedSec: typeof raw.estimatedSec === "number" ? raw.estimatedSec : undefined,
    visualCue: raw.visualCue ? String(raw.visualCue).trim() : undefined,
    topic: raw.topic ? String(raw.topic).trim() : undefined,
    subtopic: raw.subtopic ? String(raw.subtopic).trim() : undefined,
    concept: raw.concept ? String(raw.concept).trim() : undefined,
    whyIncorrect: raw.whyIncorrect
      ? String(raw.whyIncorrect).trim()
      : raw.commonMistake
        ? String(raw.commonMistake).trim()
        : undefined,
  };
}

/** Parse structured questions from a trailing ```json block. */
export function parseQuestionsJsonBlock(content: string): GigaLearnQuestion[] {
  const match = content.match(/```json\s*([\s\S]*?)```/i);
  if (!match?.[1]) return [];
  try {
    const parsed = JSON.parse(match[1]) as { questions?: unknown[] } | unknown[];
    const list = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.questions)
        ? parsed.questions
        : [];
    return list
      .map((item, i) =>
        item && typeof item === "object" ? coerceQuestion(item as Record<string, unknown>, i) : null
      )
      .filter((q): q is GigaLearnQuestion => Boolean(q));
  } catch {
    return [];
  }
}

/** Lenient markdown MCQ parser when JSON is missing. */
export function parseQuestionsFromMarkdown(content: string): GigaLearnQuestion[] {
  const lines = content.split(/\n+/);
  const questions: GigaLearnQuestion[] = [];
  let current: Partial<GigaLearnQuestion> | null = null;
  let options: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const qMatch = trimmed.match(/^(?:\d+[\).:\-—]|Q\d+[:.)])\s*(.+)/i);
    if (qMatch) {
      if (current?.stem) {
        questions.push(finalizeMarkdownQuestion(current, options, questions.length));
      }
      current = { stem: qMatch[1].replace(/\*\*/g, "").trim() };
      options = [];
      continue;
    }
    const optMatch = trimmed.match(/^([A-Da-d])[\).:\-—]\s*(.+)/);
    if (optMatch && current) {
      options.push(optMatch[2].trim());
      continue;
    }
    if (/^answer\s*[:=]/i.test(trimmed) && current) {
      current.correctAnswer = trimmed.replace(/^answer\s*[:=]\s*/i, "").trim();
    }
    if (/^explanation\s*[:=]/i.test(trimmed) && current) {
      current.explanation = trimmed.replace(/^explanation\s*[:=]\s*/i, "").trim();
    }
  }
  if (current?.stem) {
    questions.push(finalizeMarkdownQuestion(current, options, questions.length));
  }
  return questions.filter((q) => q.correctAnswer && q.explanation);
}

function finalizeMarkdownQuestion(
  partial: Partial<GigaLearnQuestion>,
  options: string[],
  index: number
): GigaLearnQuestion {
  const stem = partial.stem ?? "Question";
  return {
    id: slugId(stem, index),
    type: options.length ? "mcq" : "short_answer",
    stem,
    options: options.length ? options : undefined,
    correctAnswer: partial.correctAnswer ?? (options[0] ?? ""),
    explanation: partial.explanation ?? "Review the worked solution above.",
    points: 1,
  };
}

export function parseQuestionsFromContent(content: string): GigaLearnQuestion[] {
  const fromJson = parseQuestionsJsonBlock(content);
  const raw = fromJson.length ? fromJson : parseQuestionsFromMarkdown(content);
  return filterRenderableQuestions(raw);
}

const RENDERABLE_PRACTICE_TYPES = new Set<GigaLearnQuestionType>([
  "mcq",
  "poll",
  "true_false",
  "short_answer",
  "fill_blank",
  "ordering",
]);

/** Drop AI question types/fields the interactive UI cannot render safely. */
export function isRenderablePracticeQuestion(question: GigaLearnQuestion): boolean {
  if (!RENDERABLE_PRACTICE_TYPES.has(question.type)) return false;
  if (!question.stem.trim() || !question.explanation.trim()) return false;
  if (
    (question.type === "mcq" ||
      question.type === "poll" ||
      question.type === "true_false") &&
    !question.options?.length
  ) {
    return false;
  }
  if (question.type === "ordering" && !question.options?.length) return false;
  return true;
}

export function filterRenderableQuestions(
  questions: GigaLearnQuestion[]
): GigaLearnQuestion[] {
  return questions.filter(isRenderablePracticeQuestion);
}

export function resolveSelectedAnswerText(
  question: GigaLearnQuestion,
  userAnswer: string | string[]
): string {
  if (Array.isArray(userAnswer)) return userAnswer.join(" → ");
  const letter = userAnswer.match(/^([a-d])$/i);
  if (letter && question.options?.length) {
    const idx = letter[1].toLowerCase().charCodeAt(0) - 97;
    const opt = question.options[idx];
    if (opt) return opt;
  }
  return userAnswer;
}

export function formatCorrectAnswer(question: GigaLearnQuestion): string {
  const correct = question.correctAnswer;
  if (Array.isArray(correct)) return correct.join(" → ");
  const asString = String(correct);
  if (question.options?.length && /^[a-d]$/i.test(asString)) {
    const idx = asString.toLowerCase().charCodeAt(0) - 97;
    const opt = question.options[idx];
    if (opt) return opt;
  }
  return asString;
}

export function gradeAnswer(
  question: GigaLearnQuestion,
  userAnswer: string | string[]
): { correct: boolean; normalizedCorrect: string } {
  const correct = question.correctAnswer;

  if (question.type === "ordering" && Array.isArray(userAnswer) && Array.isArray(correct)) {
    const ok =
      userAnswer.length === correct.length &&
      userAnswer.every((a, i) => normalizeAnswer(a) === normalizeAnswer(correct[i]));
    return { correct: ok, normalizedCorrect: correct.join(" → ") };
  }

  const user = normalizeAnswer(
    Array.isArray(userAnswer) ? userAnswer.join(" ") : userAnswer
  );

  if (Array.isArray(correct)) {
    const normalized = correct.map(normalizeAnswer);
    const ok = normalized.includes(user);
    return { correct: ok, normalizedCorrect: correct.join(", ") };
  }

  const normalizedCorrect = normalizeAnswer(correct);
  if (question.type === "true_false") {
    const tf = user.startsWith("t") || user === "yes" || user === "true";
    const cf = normalizedCorrect.startsWith("t") || normalizedCorrect === "yes";
    return { correct: tf === cf, normalizedCorrect: correct };
  }

  if (question.options?.length) {
    const letter = user.match(/^([a-d])\b/)?.[1];
    if (letter) {
      const idx = letter.charCodeAt(0) - 97;
      const selected = question.options[idx];
      if (selected) {
        return {
          correct: normalizeAnswer(selected) === normalizedCorrect,
          normalizedCorrect: correct,
        };
      }
    }
  }

  return {
    correct: user === normalizedCorrect || user.includes(normalizedCorrect),
    normalizedCorrect: correct,
  };
}

export function computePracticeScore(
  results: Array<{ correct: boolean }>
): number {
  if (!results.length) return 0;
  const correct = results.filter((r) => r.correct).length;
  return Math.round((correct / results.length) * 100);
}

/** Built-in samples when AI output lacks a JSON block (offline / parse fallback). */
export function getPracticeFallbackQuestions(
  level: string,
  subject: string
): GigaLearnQuestion[] {
  const band = level.toLowerCase();
  if (band === "kg" || band.includes("nursery")) {
    return [
      {
        id: "kg_basket_apples",
        type: "mcq",
        stem: "Which basket has 3 apples?",
        options: ["🍎🍎🍎", "🍎🍎", "🍎🍎🍎🍎"],
        correctAnswer: "🍎🍎🍎",
        explanation: "Count the apples. One, two, three — the first basket has 3 apples.",
        points: 1,
        learningObjective: "Count objects up to 5",
        topic: "counting",
        whyIncorrect: "Count each apple one by one — don't guess.",
      },
    ];
  }
  if (band === "primary" || band.includes("primary")) {
    return [
      {
        id: "primary_ama_oranges",
        type: "mcq",
        stem: "Ama has 12 oranges and shares them equally among 3 friends. How many does each friend get?",
        options: ["3", "4", "5", "6"],
        correctAnswer: "4",
        explanation:
          "Division means sharing equally. 12 ÷ 3 = 4, so each friend gets 4 oranges.",
        points: 1,
        learningObjective: "Division as equal sharing",
        topic: "division",
        concept: "Share equally into equal groups",
        whyIncorrect: "12 shared into 3 groups is not 3 — try dividing 12 by 3.",
      },
    ];
  }
  if (
    subject === "coding" ||
    subject === "ict" ||
    subject.includes("coding") ||
    subject.includes("computing")
  ) {
    return [
      {
        id: "coding_sequence",
        type: "ordering",
        stem: "Put these steps in the correct order for making tea.",
        options: ["Boil water", "Add tea bag to cup", "Pour hot water", "Wait and remove bag"],
        correctAnswer: ["Boil water", "Add tea bag to cup", "Pour hot water", "Wait and remove bag"],
        explanation:
          "Algorithms are ordered steps. You boil water before pouring it, and add the bag before steeping.",
        points: 2,
        learningObjective: "Sequencing instructions",
        topic: "algorithms",
        concept: "Instructions must follow a logical order",
      },
    ];
  }
  if (subject === "robotics") {
    return [
      {
        id: "robotics_next_step",
        type: "mcq",
        stem: "A school robot reaches a wall. What should happen next?",
        options: [
          "Keep moving forward",
          "Stop and turn using sensor feedback",
          "Remove the wheels",
          "Turn off the program",
        ],
        correctAnswer: "Stop and turn using sensor feedback",
        explanation:
          "Robots use sensors as inputs. When a wall is detected, the program should change motor output — stop or turn.",
        points: 2,
        learningObjective: "Sensors and robot logic",
        topic: "robotics",
        concept: "Sense → decide → act",
        whyIncorrect: "Moving forward into a wall will not solve the challenge.",
      },
    ];
  }
  if (subject === "stem") {
    return [
      {
        id: "stem_bridge_shape",
        type: "mcq",
        stem: "Kofi is building a paper bridge for a STEM fair. Which shape is strongest for the truss?",
        options: ["Circle only", "Triangle", "Wavy line", "Single straight stick"],
        correctAnswer: "Triangle",
        explanation:
          "Triangles resist changing shape under load, so they spread weight better in simple engineering designs.",
        points: 2,
        learningObjective: "Engineering structures",
        topic: "stem",
        concept: "Strong shapes in building",
      },
    ];
  }
  if (band.startsWith("shs")) {
    return [
      {
        id: "shs_stem_bridge",
        type: "mcq",
        stem:
          "A bridge design uses triangles in its truss. Why are triangles often used in bridge structures?",
        options: [
          "They are easy to paint",
          "They resist changing shape under load",
          "They use the least material always",
          "They float on water",
        ],
        correctAnswer: "They resist changing shape under load",
        explanation:
          "A triangle is rigid: forces at the joints cannot easily change its shape, so it spreads load efficiently in STEM structures.",
        points: 3,
        learningObjective: "Engineering structures",
      },
    ];
  }
  return [
    {
      id: "jhs_science_water",
      type: "mcq",
      stem: "Why is clean water important for Ghanaian communities?",
      options: [
        "It makes roads smoother",
        "It helps prevent waterborne diseases",
        "It increases air pressure",
        "It removes soil nutrients",
      ],
      correctAnswer: "It helps prevent waterborne diseases",
      explanation:
        "Clean water reduces germs that cause illnesses like cholera and typhoid, keeping learners and families healthy.",
      points: 2,
      learningObjective: "Health and environment",
      topic: "integrated science",
      concept: "Safe water protects community health",
      whyIncorrect: "Clean water is about health, not road building.",
    },
    {
      id: "jhs_math_cocoa",
      type: "mcq",
      stem: "A farmer harvests 48 cocoa pods and shares them equally among 6 baskets. How many pods go in each basket?",
      options: ["6", "7", "8", "9"],
      correctAnswer: "8",
      explanation: "48 ÷ 6 = 8. Each basket gets 8 pods when shared equally.",
      points: 2,
      learningObjective: "Division in real contexts",
      topic: "mathematics",
      concept: "Equal sharing with division",
    },
  ];
}
