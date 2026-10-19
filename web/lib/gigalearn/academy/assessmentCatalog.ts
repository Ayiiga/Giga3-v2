/**
 * Built-in Academy assessments — reuse GigaLearnQuestion + gradeAnswer.
 * Not a second question-bank engine; definitions only.
 */
import type { GigaLearnQuestion } from "@/lib/gigalearn/questions";
import { computePracticeScore, gradeAnswer } from "@/lib/gigalearn/questions";

export type AcademyAssessmentKind = "lesson_quiz" | "module_quiz" | "final";

export type AcademyGradingMode = "objective" | "ai_assisted" | "instructor_review";

export type AcademyAssessmentDefinition = {
  id: string;
  courseSlug: string;
  title: string;
  description: string;
  kind: AcademyAssessmentKind;
  moduleId?: string;
  lessonId?: string;
  passThreshold: number;
  maxAttempts: number;
  gradingMode: AcademyGradingMode;
  /** Must pass these assessment ids before this one unlocks. */
  requiresPassedAssessmentIds: string[];
  /** Module unlocked after a passing attempt (progression). */
  gatesModuleId?: string;
  /** Hide answer keys from learners even after grading (protected finals). */
  protectedFinal: boolean;
  timeLimitMinutes?: number;
  questions: GigaLearnQuestion[];
};

const BUILTIN: AcademyAssessmentDefinition[] = [
  {
    id: "bece-maths-m1-quiz",
    courseSlug: "bece-maths-foundations",
    title: "Numbers & operations check",
    description: "Short objective quiz for module 1. Server-graded; tutoring does not count as a pass.",
    kind: "module_quiz",
    moduleId: "m1-numbers",
    passThreshold: 70,
    maxAttempts: 3,
    gradingMode: "objective",
    requiresPassedAssessmentIds: [],
    gatesModuleId: "m2-algebra",
    protectedFinal: false,
    questions: [
      {
        id: "q1",
        type: "mcq",
        stem: "What is 3/4 + 1/4?",
        options: ["1", "1/2", "2/4", "3/8"],
        correctAnswer: "1",
        explanation: "Same denominator: 3/4 + 1/4 = 4/4 = 1.",
        points: 1,
        topic: "fractions",
      },
      {
        id: "q2",
        type: "true_false",
        stem: "15 ÷ 3 = 5.",
        correctAnswer: "true",
        explanation: "Three groups of 5 make 15.",
        points: 1,
        topic: "division",
      },
      {
        id: "q3",
        type: "mcq",
        stem: "Which number is a multiple of 6?",
        options: ["14", "18", "20", "25"],
        correctAnswer: "18",
        explanation: "6 × 3 = 18.",
        points: 1,
        topic: "multiples",
      },
    ],
  },
  {
    id: "bece-maths-m2-quiz",
    courseSlug: "bece-maths-foundations",
    title: "Introductory algebra check",
    description: "Objective quiz for module 2. Requires a pass on the Numbers quiz first.",
    kind: "module_quiz",
    moduleId: "m2-algebra",
    passThreshold: 70,
    maxAttempts: 3,
    gradingMode: "objective",
    requiresPassedAssessmentIds: ["bece-maths-m1-quiz"],
    gatesModuleId: "m3-revision",
    protectedFinal: false,
    questions: [
      {
        id: "q1",
        type: "mcq",
        stem: "If x + 4 = 10, what is x?",
        options: ["4", "6", "14", "40"],
        correctAnswer: "6",
        explanation: "Subtract 4 from both sides: x = 6.",
        points: 1,
        topic: "equations",
      },
      {
        id: "q2",
        type: "mcq",
        stem: "Simplify 2a + 3a.",
        options: ["5a", "6a", "5", "a^5"],
        correctAnswer: "5a",
        explanation: "Like terms: 2a + 3a = 5a.",
        points: 1,
        topic: "algebra",
      },
      {
        id: "q3",
        type: "short_answer",
        stem: "In one short sentence, what does a variable represent in an equation?",
        correctAnswer: "an unknown value",
        explanation: "A variable stands for an unknown number we can solve for.",
        points: 1,
        topic: "algebra",
      },
    ],
  },
  {
    id: "bece-maths-final",
    courseSlug: "bece-maths-foundations",
    title: "BECE Maths Foundations — protected checkpoint",
    description:
      "Protected final-style checkpoint. Answer keys stay hidden; pass required for course completion signal.",
    kind: "final",
    passThreshold: 75,
    maxAttempts: 2,
    gradingMode: "objective",
    requiresPassedAssessmentIds: ["bece-maths-m1-quiz", "bece-maths-m2-quiz"],
    protectedFinal: true,
    questions: [
      {
        id: "f1",
        type: "mcq",
        stem: "Compute 2/5 of 20.",
        options: ["4", "8", "10", "12"],
        correctAnswer: "8",
        explanation: "2/5 × 20 = 8.",
        points: 2,
      },
      {
        id: "f2",
        type: "mcq",
        stem: "Solve: y − 7 = 9.",
        options: ["2", "16", "63", "−2"],
        correctAnswer: "16",
        explanation: "Add 7: y = 16.",
        points: 2,
      },
      {
        id: "f3",
        type: "true_false",
        stem: "A rectangle with sides 3 and 4 has perimeter 14.",
        correctAnswer: "true",
        explanation: "Perimeter = 2(3+4) = 14.",
        points: 1,
      },
    ],
  },
  {
    id: "wassce-english-m1-quiz",
    courseSlug: "wassce-english-writing",
    title: "Essay foundations check",
    description: "Mix of objective items plus one short response for AI-assisted feedback (not an official grade).",
    kind: "module_quiz",
    moduleId: "m1-essay",
    passThreshold: 70,
    maxAttempts: 3,
    gradingMode: "ai_assisted",
    requiresPassedAssessmentIds: [],
    gatesModuleId: "m2-exam",
    protectedFinal: false,
    questions: [
      {
        id: "q1",
        type: "mcq",
        stem: "A strong essay introduction usually includes:",
        options: [
          "A clear thesis / controlling idea",
          "Only jokes with no topic",
          "Random dictionary words",
          "The conclusion only",
        ],
        correctAnswer: "A clear thesis / controlling idea",
        explanation: "Readers need a controlling idea early.",
        points: 1,
      },
      {
        id: "q2",
        type: "true_false",
        stem: "Each body paragraph should usually develop one main point.",
        correctAnswer: "true",
        explanation: "One main point per paragraph keeps writing clear.",
        points: 1,
      },
      {
        id: "q3",
        type: "short_answer",
        stem: "In 2–3 sentences, outline how you would structure a WASSCE essay on community service.",
        correctAnswer:
          "Introduction with thesis, body paragraphs with examples, conclusion restating the main idea.",
        explanation: "Structure: intro → developed points with examples → conclusion.",
        points: 2,
      },
    ],
  },
  {
    id: "teacher-studio-review",
    courseSlug: "teacher-lesson-studio-basics",
    title: "Teacher Studio reflection (instructor review)",
    description: "Short reflection held for instructor review — AI may assist but does not finalize the official result.",
    kind: "lesson_quiz",
    moduleId: "m1-lesson",
    passThreshold: 70,
    maxAttempts: 2,
    gradingMode: "instructor_review",
    requiresPassedAssessmentIds: [],
    protectedFinal: false,
    questions: [
      {
        id: "r1",
        type: "short_answer",
        stem: "Describe one lesson you generated and how you would adapt it for a large class.",
        correctAnswer: "Instructor review — no single key.",
        explanation: "Reviewed by an authorized instructor.",
        points: 5,
      },
    ],
  },
];

export function listBuiltinAssessmentsForCourse(courseSlug: string): AcademyAssessmentDefinition[] {
  const slug = courseSlug.trim().toLowerCase();
  return BUILTIN.filter((a) => a.courseSlug === slug);
}

export function getBuiltinAssessment(
  courseSlug: string,
  assessmentId: string
): AcademyAssessmentDefinition | undefined {
  return listBuiltinAssessmentsForCourse(courseSlug).find((a) => a.id === assessmentId);
}

export function listAllBuiltinAssessments(): AcademyAssessmentDefinition[] {
  return [...BUILTIN];
}

/** Public view: strip answer keys / explanations until after grading. */
export function toPublicAssessmentQuestions(
  questions: GigaLearnQuestion[],
  opts: { includeKeys: boolean; protectedFinal: boolean }
): Array<Omit<GigaLearnQuestion, "correctAnswer" | "explanation" | "whyIncorrect"> & {
  correctAnswer?: GigaLearnQuestion["correctAnswer"];
  explanation?: string;
}> {
  return questions.map((q) => {
    const base = {
      id: q.id,
      type: q.type,
      stem: q.stem,
      options: q.options,
      hint: q.hint,
      difficulty: q.difficulty,
      learningObjective: q.learningObjective,
      points: q.points,
      estimatedSec: q.estimatedSec,
      visualCue: q.visualCue,
      topic: q.topic,
      subtopic: q.subtopic,
      concept: q.concept,
    };
    if (!opts.includeKeys || opts.protectedFinal) return base;
    return {
      ...base,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      whyIncorrect: q.whyIncorrect,
    };
  });
}

export type ObjectiveGradeResult = {
  questionId: string;
  correct: boolean;
  pointsEarned: number;
  pointsPossible: number;
  explanation?: string;
  normalizedCorrect?: string;
};

export function gradeObjectiveSubmission(
  assessment: AcademyAssessmentDefinition,
  answers: Record<string, string | string[]>
): {
  results: ObjectiveGradeResult[];
  score: number;
  maxScore: number;
  passed: boolean;
  objectiveQuestionIds: string[];
  subjectiveQuestionIds: string[];
} {
  const objectiveTypes = new Set(["mcq", "true_false", "fill_blank", "ordering", "matching"]);
  const results: ObjectiveGradeResult[] = [];
  const objectiveQuestionIds: string[] = [];
  const subjectiveQuestionIds: string[] = [];

  for (const q of assessment.questions) {
    const points = q.points ?? 1;
    const isObjective =
      assessment.gradingMode === "objective" ||
      (assessment.gradingMode === "ai_assisted" && objectiveTypes.has(q.type)) ||
      (assessment.gradingMode === "instructor_review" && objectiveTypes.has(q.type));

    if (!isObjective && (q.type === "short_answer" || assessment.gradingMode === "instructor_review")) {
      subjectiveQuestionIds.push(q.id);
      // Subjective: scored later (AI assist / instructor). Count points in maxScore.
      results.push({
        questionId: q.id,
        correct: false,
        pointsEarned: 0,
        pointsPossible: points,
      });
      continue;
    }

    objectiveQuestionIds.push(q.id);
    const raw = answers[q.id];
    if (raw == null || (typeof raw === "string" && !raw.trim())) {
      results.push({
        questionId: q.id,
        correct: false,
        pointsEarned: 0,
        pointsPossible: points,
        explanation: assessment.protectedFinal ? undefined : q.explanation,
      });
      continue;
    }
    const graded = gradeAnswer(q, raw);
    results.push({
      questionId: q.id,
      correct: graded.correct,
      pointsEarned: graded.correct ? points : 0,
      pointsPossible: points,
      explanation: assessment.protectedFinal ? undefined : q.explanation,
      normalizedCorrect: assessment.protectedFinal ? undefined : graded.normalizedCorrect,
    });
  }

  const maxScore = results.reduce((n, r) => n + r.pointsPossible, 0);
  const earned = results.reduce((n, r) => n + r.pointsEarned, 0);
  const score = maxScore > 0 ? Math.round((earned / maxScore) * 100) : 0;
  // For mixed AI modes, preliminary pass uses objective-only ratio when subjective pending.
  const obj = results.filter((r) => objectiveQuestionIds.includes(r.questionId));
  const prelim =
    assessment.gradingMode === "ai_assisted" && subjectiveQuestionIds.length
      ? computePracticeScore(obj.map((r) => ({ correct: r.correct })))
      : score;

  return {
    results,
    score: assessment.gradingMode === "instructor_review" ? 0 : prelim,
    maxScore: 100,
    passed:
      assessment.gradingMode === "instructor_review"
        ? false
        : prelim >= assessment.passThreshold && subjectiveQuestionIds.length === 0,
    objectiveQuestionIds,
    subjectiveQuestionIds,
  };
}

export function unlockedModuleIds(
  courseModuleIds: string[],
  assessments: AcademyAssessmentDefinition[],
  passedAssessmentIds: Set<string>
): string[] {
  const gatedBy = new Map<string, string[]>();
  for (const a of assessments) {
    if (!a.gatesModuleId) continue;
    const list = gatedBy.get(a.gatesModuleId) ?? [];
    list.push(a.id);
    gatedBy.set(a.gatesModuleId, list);
  }
  return courseModuleIds.filter((moduleId) => {
    const required = gatedBy.get(moduleId);
    if (!required || required.length === 0) return true;
    return required.every((id) => passedAssessmentIds.has(id));
  });
}

export function assessmentIsUnlocked(
  assessment: AcademyAssessmentDefinition,
  passedAssessmentIds: Set<string>
): boolean {
  return assessment.requiresPassedAssessmentIds.every((id) => passedAssessmentIds.has(id));
}
