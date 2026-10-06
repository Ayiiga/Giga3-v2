/** Level selector for GigaLearn — lower grades use concrete objects, not abstract concepts. */

export type GigaLearnLevelId =
  | "Creche"
  | "KG1"
  | "KG2"
  | "P1"
  | "P2"
  | "P3"
  | "P4-P6"
  | "JHS1-3"
  | "SHS1-3"
  | "University"
  | "Adult";

export type GigaLearnLevel = {
  id: GigaLearnLevelId;
  label: string;
  ages: string;
  emoji: string;
};

export const GIGALEARN_LEVELS: GigaLearnLevel[] = [
  { id: "Creche", label: "Creche", ages: "0–2", emoji: "🧸" },
  { id: "KG1", label: "KG1", ages: "3–4", emoji: "🧩" },
  { id: "KG2", label: "KG2", ages: "4–5", emoji: "🎨" },
  { id: "P1", label: "P1", ages: "5–6", emoji: "🍎" },
  { id: "P2", label: "P2", ages: "6–7", emoji: "✏️" },
  { id: "P3", label: "P3", ages: "7–8", emoji: "📚" },
  { id: "P4-P6", label: "P4–P6", ages: "8–11", emoji: "🔢" },
  { id: "JHS1-3", label: "JHS1–3", ages: "12–14", emoji: "📝" },
  { id: "SHS1-3", label: "SHS1–3", ages: "15–17", emoji: "🎓" },
  { id: "University", label: "University", ages: "18+", emoji: "🏛️" },
  { id: "Adult", label: "Adult", ages: "All", emoji: "🌍" },
];

/** Lower grades learn with concrete objects, fruits, and real items — never abstract. */
export const LOWER_GRADE_LEVELS: GigaLearnLevelId[] = [
  "Creche",
  "KG1",
  "KG2",
  "P1",
  "P2",
  "P3",
];

export function isLowerGrade(level: GigaLearnLevelId | string): boolean {
  return (LOWER_GRADE_LEVELS as string[]).includes(level);
}

export function getLevel(id: string): GigaLearnLevel | undefined {
  return GIGALEARN_LEVELS.find((l) => l.id === id);
}

/** Count range for concrete counting — lower grades up to 20. */
export function countRangeForLevel(level: string): { min: number; max: number } {
  if (level === "Creche" || level === "KG1" || level === "KG2") return { min: 1, max: 20 };
  if (level === "P1" || level === "P2" || level === "P3") return { min: 1, max: 20 };
  return { min: 1, max: 100 };
}

const EARLY_YEARS_CURRICULUM_LEVELS = new Set(["kg-1", "kg-2", "creche"]);

/** True when learner context is Creche / KG (Early Years band). */
export function isEarlyYearsCurriculumLevel(levelId: string | undefined | null): boolean {
  if (!levelId) return false;
  return EARLY_YEARS_CURRICULUM_LEVELS.has(levelId.trim().toLowerCase());
}

/** True when learner context uses concrete-object mode (Creche–P3). */
export function isLowerGradeCurriculumLevel(levelId: string | undefined | null): boolean {
  if (!levelId) return false;
  const normalized = levelId.trim().toLowerCase();
  if (EARLY_YEARS_CURRICULUM_LEVELS.has(normalized)) return true;
  return /^basic-[1-3]$/.test(normalized);
}

/** Map concrete level chips (Creche, KG1, P1…) to canonical curriculum level ids. */
export function gigaLearnLevelToCurriculumLevelId(level: GigaLearnLevelId): string {
  const map: Record<GigaLearnLevelId, string> = {
    Creche: "kg-1",
    KG1: "kg-1",
    KG2: "kg-2",
    P1: "basic-1",
    P2: "basic-2",
    P3: "basic-3",
    "P4-P6": "basic-5",
    "JHS1-3": "basic-8",
    "SHS1-3": "basic-11",
    University: "basic-12",
    Adult: "basic-12",
  };
  return map[level] ?? "kg-1";
}

/** Best-effort inverse for syncing StudioContext → concrete level chip. */
export function curriculumLevelIdToGigaLearnLevel(levelId: string): GigaLearnLevelId {
  const normalized = levelId.trim().toLowerCase();
  switch (normalized) {
    case "kg-1":
    case "creche":
    case "kg1":
      return "KG1";
    case "kg-2":
    case "kg2":
      return "KG2";
    case "basic-1":
    case "p1":
      return "P1";
    case "basic-2":
    case "p2":
      return "P2";
    case "basic-3":
    case "p3":
      return "P3";
    default:
      return "KG1";
  }
}
