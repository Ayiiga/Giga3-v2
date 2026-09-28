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

/** Count range for concrete counting — KG stays within 1–5. */
export function countRangeForLevel(level: string): { min: number; max: number } {
  if (level === "Creche" || level === "KG1" || level === "KG2") return { min: 1, max: 5 };
  if (level === "P1" || level === "P2" || level === "P3") return { min: 1, max: 10 };
  return { min: 1, max: 100 };
}
