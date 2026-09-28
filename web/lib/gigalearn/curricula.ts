/** Modular curricula — flat legacy selectors bridged onto the curriculum engine.
 *
 * The dependent hierarchy (Country → Curriculum → Level → Subject) lives in
 * `curriculumEngine.ts`. This module keeps the legacy `EXAM_BOARDS`,
 * `SUBJECTS` and `EDUCATION_LEVELS` exports working for saved profiles,
 * homework handoffs and existing imports, while exposing the engine-driven
 * lists for the new progressive UI.
 */

import {
  CURRICULUM_LEVELS,
  CURRICULUM_SUBJECTS,
  GHANA_CURRICULA,
  getCurriculum as getEngineCurriculum,
  getLevel as getEngineLevel,
  getSubject as getEngineSubject,
  resolveLegacyLevelId,
  resolveSubjectId,
} from "@/lib/gigalearn/curriculumEngine";

export type ExamBoardId =
  | "bece"
  | "wassce"
  | "waec"
  | "jhs"
  | "shs"
  | "university"
  | "primary";

export type LearnerRole = "student" | "teacher" | "parent";

export interface ExamBoardDefinition {
  id: ExamBoardId;
  label: string;
  region: string;
  description: string;
}

export interface SubjectDefinition {
  id: string;
  label: string;
  emoji: string;
}

export interface EducationLevelDefinition {
  id: string;
  label: string;
  boards: ExamBoardId[];
}

export const EXAM_BOARDS: ExamBoardDefinition[] = [
  {
    id: "bece",
    label: "BECE",
    region: "Ghana",
    description: "Basic Education Certificate Examination (JHS)",
  },
  {
    id: "wassce",
    label: "WASSCE",
    region: "West Africa",
    description: "West African Senior School Certificate Examination",
  },
  {
    id: "waec",
    label: "WAEC",
    region: "West Africa",
    description: "West African Examinations Council syllabi",
  },
  {
    id: "primary",
    label: "Primary",
    region: "General",
    description: "Upper primary school (Class 4–6)",
  },
  {
    id: "jhs",
    label: "JHS",
    region: "Ghana",
    description: "Junior High School levels",
  },
  {
    id: "shs",
    label: "SHS",
    region: "Ghana",
    description: "Senior High School levels",
  },
  {
    id: "university",
    label: "University",
    region: "General",
    description: "Tertiary and higher education",
  },
];

/**
 * Canonical subject list (NaCCA names + icons). Legacy ids (`ict`,
 * `coding`, `creative-arts`, `religious-moral`, `business`) are kept as
 * deprecated aliases so saved profiles and old content keep resolving —
 * the new UI never offers "Coding" as a subject name.
 */
export const SUBJECTS: SubjectDefinition[] = [
  ...CURRICULUM_SUBJECTS.map((s) => ({ id: s.id, label: s.label, emoji: s.icon })),
  // Deprecated aliases for previously saved selections (not shown in new UI).
  { id: "ict", label: "Computing", emoji: "💻" },
  { id: "coding", label: "Computing", emoji: "💻" },
  { id: "creative-arts", label: "Creative Arts & Design", emoji: "🎨" },
  { id: "religious-moral", label: "Religious & Moral Education", emoji: "🙏" },
  { id: "business", label: "Business Studies", emoji: "💼" },
  { id: "english", label: "English Language", emoji: "📚" },
  { id: "science", label: "Science", emoji: "🔬" },
];

const LEGACY_LEVEL_BOARDS: Record<string, ExamBoardId[]> = {
  kg: ["primary", "waec"],
  primary: ["primary", "waec"],
  "jhs-1": ["jhs", "bece", "waec"],
  "jhs-2": ["jhs", "bece", "waec"],
  "jhs-3": ["jhs", "bece", "waec"],
  "shs-1": ["shs", "wassce", "waec"],
  "shs-2": ["shs", "wassce", "waec"],
  "shs-3": ["shs", "wassce", "waec"],
  university: ["university"],
};

function boardsForEngineLevel(levelId: string): ExamBoardId[] {
  const level = getEngineLevel(levelId);
  if (!level) return ["waec"];
  switch (level.band) {
    case "early-years":
    case "primary":
      return ["primary", "waec"];
    case "jhs":
      return ["jhs", "bece", "waec"];
    case "shs":
      return ["shs", "wassce", "waec"];
    default:
      return ["university"];
  }
}

export const EDUCATION_LEVELS: EducationLevelDefinition[] = [
  // Canonical granular levels (new UI).
  ...CURRICULUM_LEVELS.map((l) => ({
    id: l.id,
    label: l.label,
    boards: boardsForEngineLevel(l.id),
  })),
  // Legacy ids for previously saved selections (not shown in new UI).
  ...Object.entries(LEGACY_LEVEL_BOARDS).map(([id, boards]) => ({
    id,
    label:
      id === "kg"
        ? "KG / Nursery"
        : id === "primary"
          ? "Primary"
          : id.startsWith("jhs-")
            ? `JHS ${id.slice(4)}`
            : id.startsWith("shs-")
              ? `SHS ${id.slice(4)}`
              : "University",
    boards,
  })),
];

export function getExamBoard(id: string): ExamBoardDefinition | undefined {
  return EXAM_BOARDS.find((b) => b.id === id);
}

export function getSubject(id: string): SubjectDefinition | undefined {
  const canonical = resolveSubjectId(id);
  const engine = getEngineSubject(canonical);
  if (engine) return { id: engine.id, label: engine.label, emoji: engine.icon };
  return SUBJECTS.find((s) => s.id === id);
}

export function getEducationLevel(id: string): EducationLevelDefinition | undefined {
  const canonical = resolveLegacyLevelId(id);
  return EDUCATION_LEVELS.find((l) => l.id === canonical);
}

/** Engine curricula exposed for future country/curriculum pickers. */
export function getGhanaCurricula() {
  return GHANA_CURRICULA;
}

export function getCurriculumLabel(id: string): string {
  return getEngineCurriculum(id)?.label ?? id;
}
