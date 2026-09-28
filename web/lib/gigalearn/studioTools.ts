/**
 * Phase 2 Teacher Studio / assessment tool registry.
 *
 * Every tool here consumes the Phase 1 curriculum engine
 * (`curriculumEngine.ts`) for context — no second curriculum model, no
 * duplicated subject lists, no hard-coded alternative subject names.
 * Generation itself flows through the existing
 * `gigalearnStudio.generateContent` action (same credits/providers).
 */
import {
  BookOpen,
  ClipboardList,
  FileQuestion,
  Film,
  FlaskConical,
  Layers,
  Lightbulb,
  NotebookPen,
  Presentation,
  ScrollText,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type StudioToolId =
  | "lesson-generator"
  | "lesson-notes"
  | "quiz-generator"
  | "assignment-generator"
  | "worksheet-generator"
  | "assessment-generator"
  | "presentation-generator"
  | "video-script-generator"
  | "flashcard-generator"
  | "teaching-aid-generator"
  | "practical-activity-generator"
  | "bece-mock"
  | "topic-explainer"
  | "revision-guide";

export interface StudioToolDefinition {
  id: StudioToolId;
  /** Backend tool id sent to gigalearnStudio.generateContent. */
  backendToolId: string;
  label: string;
  description: string;
  icon: LucideIcon;
  creditCost: number;
  /** "teacher" tools appear in Teacher Studio; "student" in Learn Mode. */
  audiences: Array<"teacher" | "student">;
  supportsInteractivePractice: boolean;
}

export const STUDIO_TOOLS: StudioToolDefinition[] = [
  {
    id: "lesson-generator",
    backendToolId: "lesson-generator",
    label: "Lesson Generator",
    description: "Full lesson: overview, development and teacher support",
    icon: Sparkles,
    creditCost: 2,
    audiences: ["teacher"],
    supportsInteractivePractice: false,
  },
  {
    id: "lesson-notes",
    backendToolId: "lesson-notes",
    label: "Lesson Notes",
    description: "Structured notes with objectives and examples",
    icon: NotebookPen,
    creditCost: 2,
    audiences: ["teacher"],
    supportsInteractivePractice: false,
  },
  {
    id: "quiz-generator",
    backendToolId: "quiz-generator",
    label: "Quiz Generator",
    description: "Curriculum-aware quiz with answer key and marks",
    icon: FileQuestion,
    creditCost: 2,
    audiences: ["teacher", "student"],
    supportsInteractivePractice: true,
  },
  {
    id: "assignment-generator",
    backendToolId: "assignment-generator",
    label: "Assignment Generator",
    description: "Tasks with marks, submission guidance and marking guide",
    icon: ClipboardList,
    creditCost: 2,
    audiences: ["teacher"],
    supportsInteractivePractice: false,
  },
  {
    id: "worksheet-generator",
    backendToolId: "worksheet-generator",
    label: "Worksheet Generator",
    description: "Printable activities with an answer section",
    icon: ScrollText,
    creditCost: 2,
    audiences: ["teacher"],
    supportsInteractivePractice: false,
  },
  {
    id: "assessment-generator",
    backendToolId: "assessment-generator",
    label: "Assessment Generator",
    description: "Formal assessment with marking scheme",
    icon: FileQuestion,
    creditCost: 2,
    audiences: ["teacher"],
    supportsInteractivePractice: true,
  },
  {
    id: "presentation-generator",
    backendToolId: "presentation-generator",
    label: "Presentation Generator",
    description: "Convert a lesson into structured slides",
    icon: Presentation,
    creditCost: 2,
    audiences: ["teacher"],
    supportsInteractivePractice: false,
  },
  {
    id: "video-script-generator",
    backendToolId: "video-script-generator",
    label: "Video Lesson Generator",
    description: "Script, scenes, narration and captions for GigaEdit",
    icon: Film,
    creditCost: 2,
    audiences: ["teacher"],
    supportsInteractivePractice: false,
  },
  {
    id: "flashcard-generator",
    backendToolId: "flashcard-generator",
    label: "Flashcard Generator",
    description: "Front/back study cards for any topic",
    icon: Layers,
    creditCost: 2,
    audiences: ["teacher", "student"],
    supportsInteractivePractice: false,
  },
  {
    id: "teaching-aid-generator",
    backendToolId: "teaching-aid-generator",
    label: "Teaching Aid Generator",
    description: "Low-cost charts, cards and classroom displays",
    icon: Lightbulb,
    creditCost: 2,
    audiences: ["teacher"],
    supportsInteractivePractice: false,
  },
  {
    id: "practical-activity-generator",
    backendToolId: "practical-activity-generator",
    label: "Practical Activity Generator",
    description: "Hands-on procedures with safety and materials checklists",
    icon: FlaskConical,
    creditCost: 2,
    audiences: ["teacher"],
    supportsInteractivePractice: false,
  },
  {
    id: "bece-mock",
    backendToolId: "bece-mock",
    label: "BECE / Exam Prep",
    description: "Timed mock tests with explanations — AI-labelled practice",
    icon: FileQuestion,
    creditCost: 2,
    audiences: ["teacher", "student"],
    supportsInteractivePractice: true,
  },
  {
    id: "topic-explainer",
    backendToolId: "topic-explainer",
    label: "Topic Explainer",
    description: "Grade-adapted explanations with examples",
    icon: BookOpen,
    creditCost: 2,
    audiences: ["student"],
    supportsInteractivePractice: false,
  },
  {
    id: "revision-guide",
    backendToolId: "revision-guide",
    label: "Revision Guide",
    description: "Key facts, misconceptions and self-tests",
    icon: BookOpen,
    creditCost: 2,
    audiences: ["student"],
    supportsInteractivePractice: true,
  },
];

export function getStudioTool(id: string): StudioToolDefinition | undefined {
  return STUDIO_TOOLS.find((t) => t.id === id || t.backendToolId === id);
}

export function studioToolsFor(audience: "teacher" | "student"): StudioToolDefinition[] {
  return STUDIO_TOOLS.filter((t) => t.audiences.includes(audience));
}

// ---------------------------------------------------------------------------
// Assessment inputs
// ---------------------------------------------------------------------------

export const QUIZ_QUESTION_TYPES = [
  "Multiple choice",
  "True/False",
  "Short answer",
  "Structured questions",
  "Matching",
  "Fill in the blank",
  "Scenario-based questions",
  "Practical questions",
] as const;

export type QuizQuestionType = (typeof QUIZ_QUESTION_TYPES)[number];

export const QUIZ_DIFFICULTIES = ["Easy", "Medium", "Challenging", "Mixed"] as const;

export type QuizDifficulty = (typeof QUIZ_DIFFICULTIES)[number];

export const QUIZ_QUESTION_COUNTS = [5, 10, 15, 20] as const;

export interface AssessmentOptions {
  questionCount: number;
  difficulty: QuizDifficulty;
  questionTypes: QuizQuestionType[];
}

// ---------------------------------------------------------------------------
// Career Technology specialization vocabulary (practical support areas)
// ---------------------------------------------------------------------------

export const CAREER_TECH_PRACTICAL_AREAS = [
  "Practical activities",
  "Tools",
  "Materials",
  "Safety",
  "Processes",
  "Design",
  "Construction",
  "Food-related activities",
  "Textiles",
  "Entrepreneurship",
  "Product development",
  "Occupational skills",
  "Projects",
] as const;

export const CAREER_TECH_SAFETY_NOTE =
  "For practical activities, clearly identify safety requirements and the need for appropriate teacher/supervisor oversight.";

export const AI_PRACTICE_LABEL = "AI-generated practice question";

export const AI_PRACTICE_DISCLAIMER =
  `Label the question set with "${AI_PRACTICE_LABEL}" where appropriate. ` +
  "Never describe AI-generated questions as official WAEC/BECE questions unless they are actually sourced from an official source.";
