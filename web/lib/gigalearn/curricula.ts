/** Modular curricula — add countries/boards without schema changes. */

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

export const SUBJECTS: SubjectDefinition[] = [
  { id: "mathematics", label: "Mathematics", emoji: "🔢" },
  { id: "english", label: "English Language", emoji: "📖" },
  { id: "science", label: "Integrated Science", emoji: "🔬" },
  { id: "social-studies", label: "Social Studies", emoji: "🌍" },
  { id: "ict", label: "ICT / Computing", emoji: "💻" },
  { id: "french", label: "French", emoji: "🇫🇷" },
  { id: "biology", label: "Biology", emoji: "🧬" },
  { id: "chemistry", label: "Chemistry", emoji: "⚗️" },
  { id: "physics", label: "Physics", emoji: "⚡" },
  { id: "economics", label: "Economics", emoji: "📊" },
  { id: "geography", label: "Geography", emoji: "🗺️" },
  { id: "history", label: "History", emoji: "📜" },
  { id: "religious-moral", label: "RME / Moral Education", emoji: "✨" },
  { id: "creative-arts", label: "Creative Arts", emoji: "🎨" },
  { id: "business", label: "Business Studies", emoji: "💼" },
];

export const EDUCATION_LEVELS: EducationLevelDefinition[] = [
  { id: "primary", label: "Primary", boards: ["primary", "waec"] },
  { id: "jhs-1", label: "JHS 1", boards: ["jhs", "bece", "waec"] },
  { id: "jhs-2", label: "JHS 2", boards: ["jhs", "bece", "waec"] },
  { id: "jhs-3", label: "JHS 3", boards: ["jhs", "bece", "waec"] },
  { id: "shs-1", label: "SHS 1", boards: ["shs", "wassce", "waec"] },
  { id: "shs-2", label: "SHS 2", boards: ["shs", "wassce", "waec"] },
  { id: "shs-3", label: "SHS 3", boards: ["shs", "wassce", "waec"] },
  { id: "university", label: "University", boards: ["university"] },
];

export function getExamBoard(id: string): ExamBoardDefinition | undefined {
  return EXAM_BOARDS.find((b) => b.id === id);
}

export function getSubject(id: string): SubjectDefinition | undefined {
  return SUBJECTS.find((s) => s.id === id);
}
