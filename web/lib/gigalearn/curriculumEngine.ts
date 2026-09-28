/**
 * Normalized GigaLearn curriculum data model (Ghana NaCCA first).
 *
 * Hierarchy consumed by the UI with progressive disclosure:
 *   Country → Curriculum → EducationLevel → Grade → Subject
 *     → Strand → SubStrand → (ContentStandard / Indicator) → Topic
 *
 * The model is deliberately data-driven so future African curricula
 * (Nigeria, Kenya, Uganda, Tanzania, South Africa, …) can be added
 * without touching UI components.
 *
 * Strands are intentionally NOT invented here: where NaCCA strand data
 * has not been verified, the subject carries no strand list and the UI
 * falls back to free-text strand / sub-strand inputs. Never present
 * strand suggestions as official NaCCA content.
 */

export type LevelBand = "early-years" | "primary" | "jhs" | "shs" | "tertiary" | "adult";

export interface CurriculumCountry {
  id: string;
  name: string;
  flag: string;
  /** False for planned curricula that are not selectable yet. */
  available: boolean;
}

export interface CurriculumDefinition {
  id: string;
  countryId: string;
  label: string;
  shortLabel: string;
  description: string;
  levelIds: string[];
}

export interface EducationLevelDefinition {
  id: string;
  curriculumId: string;
  band: LevelBand;
  /** e.g. "Basic 7 / JHS 1" */
  label: string;
  /** e.g. "JHS 1" */
  shortLabel: string;
  /** e.g. "Basic 7" / grade shown to the AI prompt */
  gradeLabel: string;
  bandLabel: string;
}

export interface CurriculumSubject {
  id: string;
  label: string;
  icon: string;
  /** Level bands this subject may be combined with. */
  bands: LevelBand[];
  /** Legacy subject ids that resolve to this subject (old profiles / fallbacks). */
  legacyIds: string[];
  /** Contextual "Your request" placeholder for teacher/student prompts. */
  placeholder: string;
  /** Availability note shown in validation messages, e.g. for Career Technology. */
  availabilityNote?: string;
  /** Career Technology style structure hint (Grade → … → Assessment). */
  structuredPath?: string[];
}

export interface CurriculumSelection {
  countryId: string;
  curriculumId: string;
  levelId: string;
  subjectId: string;
  strand: string;
  subStrand: string;
  topic: string;
}

// ---------------------------------------------------------------------------
// Countries
// ---------------------------------------------------------------------------

export const CURRICULUM_COUNTRIES: CurriculumCountry[] = [
  { id: "ghana", name: "Ghana", flag: "🇬🇭", available: true },
  { id: "nigeria", name: "Nigeria", flag: "🇳🇬", available: false },
  { id: "kenya", name: "Kenya", flag: "🇰🇪", available: false },
  { id: "uganda", name: "Uganda", flag: "🇺🇬", available: false },
  { id: "tanzania", name: "Tanzania", flag: "🇹🇿", available: false },
  { id: "south-africa", name: "South Africa", flag: "🇿🇦", available: false },
];

export function getCountry(id: string | undefined): CurriculumCountry | undefined {
  return CURRICULUM_COUNTRIES.find((c) => c.id === id);
}

// ---------------------------------------------------------------------------
// Curricula (Ghana NaCCA)
// ---------------------------------------------------------------------------

export const GHANA_CURRICULA: CurriculumDefinition[] = [
  {
    id: "gh-ccp",
    countryId: "ghana",
    label: "Common Core Programme",
    shortLabel: "CCP",
    description: "NaCCA Common Core Programme — Early Years, Primary and JHS",
    levelIds: [
      "kg-1",
      "kg-2",
      "basic-1",
      "basic-2",
      "basic-3",
      "basic-4",
      "basic-5",
      "basic-6",
      "basic-7",
      "basic-8",
      "basic-9",
    ],
  },
  {
    id: "gh-shs",
    countryId: "ghana",
    label: "SHS / SHTS / STEM Curriculum",
    shortLabel: "SHS",
    description: "NaCCA Senior High School curriculum — Basic 10–12",
    levelIds: ["basic-10", "basic-11", "basic-12"],
  },
];

export function getCurriculaForCountry(countryId: string): CurriculumDefinition[] {
  return GHANA_CURRICULA.filter((c) => c.countryId === countryId);
}

export function getCurriculum(id: string | undefined): CurriculumDefinition | undefined {
  return GHANA_CURRICULA.find((c) => c.id === id);
}

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

const BAND_LABELS: Record<LevelBand, string> = {
  "early-years": "Early Years",
  primary: "Primary",
  jhs: "JHS / Common Core",
  shs: "SHS / SHTS / STEM",
  tertiary: "Tertiary",
  adult: "Adult",
};

export function bandLabel(band: LevelBand): string {
  return BAND_LABELS[band];
}

export const CURRICULUM_LEVELS: EducationLevelDefinition[] = [
  { id: "kg-1", curriculumId: "gh-ccp", band: "early-years", label: "KG 1", shortLabel: "KG 1", gradeLabel: "KG 1", bandLabel: "Early Years" },
  { id: "kg-2", curriculumId: "gh-ccp", band: "early-years", label: "KG 2", shortLabel: "KG 2", gradeLabel: "KG 2", bandLabel: "Early Years" },
  { id: "basic-1", curriculumId: "gh-ccp", band: "primary", label: "Basic 1", shortLabel: "Basic 1", gradeLabel: "Basic 1", bandLabel: "Primary" },
  { id: "basic-2", curriculumId: "gh-ccp", band: "primary", label: "Basic 2", shortLabel: "Basic 2", gradeLabel: "Basic 2", bandLabel: "Primary" },
  { id: "basic-3", curriculumId: "gh-ccp", band: "primary", label: "Basic 3", shortLabel: "Basic 3", gradeLabel: "Basic 3", bandLabel: "Primary" },
  { id: "basic-4", curriculumId: "gh-ccp", band: "primary", label: "Basic 4", shortLabel: "Basic 4", gradeLabel: "Basic 4", bandLabel: "Primary" },
  { id: "basic-5", curriculumId: "gh-ccp", band: "primary", label: "Basic 5", shortLabel: "Basic 5", gradeLabel: "Basic 5", bandLabel: "Primary" },
  { id: "basic-6", curriculumId: "gh-ccp", band: "primary", label: "Basic 6", shortLabel: "Basic 6", gradeLabel: "Basic 6", bandLabel: "Primary" },
  { id: "basic-7", curriculumId: "gh-ccp", band: "jhs", label: "Basic 7 / JHS 1", shortLabel: "JHS 1", gradeLabel: "Basic 7", bandLabel: "JHS / Common Core" },
  { id: "basic-8", curriculumId: "gh-ccp", band: "jhs", label: "Basic 8 / JHS 2", shortLabel: "JHS 2", gradeLabel: "Basic 8", bandLabel: "JHS / Common Core" },
  { id: "basic-9", curriculumId: "gh-ccp", band: "jhs", label: "Basic 9 / JHS 3", shortLabel: "JHS 3", gradeLabel: "Basic 9", bandLabel: "JHS / Common Core" },
  { id: "basic-10", curriculumId: "gh-shs", band: "shs", label: "Basic 10 / SHS 1", shortLabel: "SHS 1", gradeLabel: "Basic 10", bandLabel: "SHS / SHTS / STEM" },
  { id: "basic-11", curriculumId: "gh-shs", band: "shs", label: "Basic 11 / SHS 2", shortLabel: "SHS 2", gradeLabel: "Basic 11", bandLabel: "SHS / SHTS / STEM" },
  { id: "basic-12", curriculumId: "gh-shs", band: "shs", label: "Basic 12 / SHS 3", shortLabel: "SHS 3", gradeLabel: "Basic 12", bandLabel: "SHS / SHTS / STEM" },
];

export function getLevel(id: string | undefined): EducationLevelDefinition | undefined {
  return CURRICULUM_LEVELS.find((l) => l.id === id);
}

export function getLevelsForCurriculum(curriculumId: string): EducationLevelDefinition[] {
  return CURRICULUM_LEVELS.filter((l) => l.curriculumId === curriculumId);
}

/** Legacy level ids (flat selectors / saved profiles) → canonical level id. */
const LEGACY_LEVEL_MAP: Record<string, string> = {
  kg: "kg-2",
  nursery: "kg-2",
  primary: "basic-5",
  "jhs-1": "basic-7",
  "jhs-2": "basic-8",
  "jhs-3": "basic-9",
  "shs-1": "basic-10",
  "shs-2": "basic-11",
  "shs-3": "basic-12",
  university: "basic-12",
  creche: "kg-1",
  kg1: "kg-1",
  kg2: "kg-2",
  p1: "basic-1",
  p2: "basic-2",
  p3: "basic-3",
  "p4-p6": "basic-5",
  "jhs1-3": "basic-8",
  "shs1-3": "basic-11",
};

export function resolveLegacyLevelId(id: string | undefined): string {
  if (!id) return "";
  const normalized = id.trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (getLevel(normalized)) return normalized;
  return LEGACY_LEVEL_MAP[normalized] ?? id;
}

// ---------------------------------------------------------------------------
// Subjects (Ghana NaCCA)
// ---------------------------------------------------------------------------

export const CAREER_TECH_STRUCTURE_PATH = [
  "Grade",
  "Strand",
  "Sub-strand",
  "Content Standard",
  "Indicator",
  "Learning Activity",
  "Assessment",
];

export const CURRICULUM_SUBJECTS: CurriculumSubject[] = [
  {
    id: "english-language",
    label: "English Language",
    icon: "📚",
    bands: ["early-years", "primary", "jhs", "shs"],
    legacyIds: ["english"],
    placeholder: "Describe the class, topic, reading/writing skill or lesson objective…",
  },
  {
    id: "mathematics",
    label: "Mathematics",
    icon: "🔢",
    bands: ["early-years", "primary", "jhs", "shs"],
    legacyIds: [],
    placeholder: "Describe the class, topic, concept, difficulty level or exercise…",
  },
  {
    id: "science",
    label: "Science",
    icon: "🔬",
    bands: ["early-years", "primary", "jhs", "shs"],
    legacyIds: [],
    placeholder: "Describe the class, topic, concept or practical activity you need…",
  },
  {
    id: "social-studies",
    label: "Social Studies",
    icon: "🌍",
    bands: ["primary", "jhs", "shs"],
    legacyIds: [],
    placeholder: "Describe the class, topic, theme or lesson objective…",
  },
  {
    id: "computing",
    label: "Computing",
    icon: "💻",
    bands: ["primary", "jhs", "shs"],
    // "Coding" is a topic/component within Computing — never the subject name.
    legacyIds: ["ict", "coding"],
    placeholder: "Describe the class, strand, topic or computing activity you need (coding appears as a topic within Computing)…",
  },
  {
    id: "career-technology",
    label: "Career Technology",
    icon: "🛠️",
    bands: ["jhs"],
    legacyIds: [],
    placeholder: "Describe the class, strand, topic, lesson objective or activity you need…",
    availabilityNote: "Career Technology is available for JHS / Common Core learners.",
    structuredPath: CAREER_TECH_STRUCTURE_PATH,
  },
  {
    id: "creative-arts-design",
    label: "Creative Arts & Design",
    icon: "🎨",
    bands: ["early-years", "primary", "jhs"],
    legacyIds: ["creative-arts"],
    placeholder: "Describe the class, topic, art activity or lesson objective…",
  },
  {
    id: "rme",
    label: "Religious & Moral Education",
    icon: "🙏",
    bands: ["primary", "jhs", "shs"],
    legacyIds: ["religious-moral"],
    placeholder: "Describe the class, topic, value or lesson objective…",
  },
  {
    id: "physical-health-education",
    label: "Physical & Health Education",
    icon: "🏃",
    bands: ["early-years", "primary", "jhs", "shs"],
    legacyIds: [],
    placeholder: "Describe the class, topic, activity or fitness objective…",
  },
  {
    id: "ghanaian-language",
    label: "Ghanaian Language",
    icon: "🗣️",
    bands: ["early-years", "primary", "jhs", "shs"],
    legacyIds: [],
    placeholder: "Describe the class, language, topic or literacy skill…",
  },
  {
    id: "french",
    label: "French",
    icon: "🇫🇷",
    bands: ["primary", "jhs", "shs"],
    legacyIds: [],
    placeholder: "Describe the class, topic, vocabulary or communication skill…",
  },
  {
    id: "arabic",
    label: "Arabic",
    icon: "🕌",
    bands: ["jhs", "shs"],
    legacyIds: [],
    placeholder: "Describe the class, topic, script or language skill…",
  },
  // ---- Upper-primary / SHS electives & enrichment (kept working) ----
  {
    id: "history",
    label: "History",
    icon: "📜",
    bands: ["primary", "shs"],
    legacyIds: [],
    placeholder: "Describe the class, period, topic or lesson objective…",
  },
  {
    id: "biology",
    label: "Biology",
    icon: "🧬",
    bands: ["shs"],
    legacyIds: [],
    placeholder: "Describe the class, topic, concept or practical you need…",
  },
  {
    id: "chemistry",
    label: "Chemistry",
    icon: "⚗️",
    bands: ["shs"],
    legacyIds: [],
    placeholder: "Describe the class, topic, concept or practical you need…",
  },
  {
    id: "physics",
    label: "Physics",
    icon: "⚡",
    bands: ["shs"],
    legacyIds: [],
    placeholder: "Describe the class, topic, concept or calculation practice…",
  },
  {
    id: "economics",
    label: "Economics",
    icon: "📊",
    bands: ["shs"],
    legacyIds: [],
    placeholder: "Describe the class, topic, concept or exercise…",
  },
  {
    id: "geography",
    label: "Geography",
    icon: "🗺️",
    bands: ["shs"],
    legacyIds: [],
    placeholder: "Describe the class, topic, map skill or field concept…",
  },
  {
    id: "business-studies",
    label: "Business Studies",
    icon: "💼",
    bands: ["shs"],
    legacyIds: ["business"],
    placeholder: "Describe the class, topic, concept or case exercise…",
  },
  {
    id: "robotics",
    label: "Robotics",
    icon: "🤖",
    bands: ["primary", "jhs", "shs"],
    legacyIds: [],
    placeholder: "Describe the class, robotics concept, kit or challenge…",
  },
  {
    id: "stem",
    label: "STEM",
    icon: "🧪",
    bands: ["primary", "jhs", "shs"],
    legacyIds: [],
    placeholder: "Describe the class, STEM theme, project or challenge…",
  },
];

export function getSubject(id: string | undefined): CurriculumSubject | undefined {
  if (!id) return undefined;
  const normalized = id.trim().toLowerCase();
  return (
    CURRICULUM_SUBJECTS.find((s) => s.id === normalized) ??
    CURRICULUM_SUBJECTS.find((s) => s.legacyIds.includes(normalized))
  );
}

/** Canonical subject id for any legacy / alias id. Unknown ids pass through. */
export function resolveSubjectId(id: string | undefined): string {
  const found = getSubject(id);
  if (found) return found.id;
  return (id ?? "").trim().toLowerCase();
}

export function subjectDisplay(id: string | undefined): { label: string; icon: string } {
  const found = getSubject(id);
  if (found) return { label: found.label, icon: found.icon };
  return { label: id ?? "", icon: "📘" };
}

export function subjectPlaceholder(id: string | undefined): string {
  const found = getSubject(id);
  return found?.placeholder ?? "Describe the class, topic, concept or activity you need…";
}

export function getSubjectsForLevel(levelId: string): CurriculumSubject[] {
  const level = getLevel(resolveLegacyLevelId(levelId));
  if (!level) return [];
  return CURRICULUM_SUBJECTS.filter((s) => s.bands.includes(level.band));
}

export function getSubjectsForCurriculum(curriculumId: string): CurriculumSubject[] {
  const levels = getLevelsForCurriculum(curriculumId);
  const bands = new Set(levels.map((l) => l.band));
  return CURRICULUM_SUBJECTS.filter((s) => s.bands.some((b) => bands.has(b)));
}

export function isSubjectAvailableForLevel(subjectId: string, levelId: string): boolean {
  const subject = getSubject(subjectId);
  const level = getLevel(resolveLegacyLevelId(levelId));
  if (!subject || !level) return false;
  return subject.bands.includes(level.band);
}

// ---------------------------------------------------------------------------
// Smart validation — never leave stale selections in the UI
// ---------------------------------------------------------------------------

export interface CombinationCheck {
  valid: boolean;
  message: string | null;
}

export function checkCombination(levelId: string, subjectId: string): CombinationCheck {
  if (!levelId || !subjectId) return { valid: true, message: null };
  const level = getLevel(resolveLegacyLevelId(levelId));
  const subject = getSubject(subjectId);
  if (!level || !subject) return { valid: true, message: null };
  if (subject.bands.includes(level.band)) {
    return { valid: true, message: null };
  }
  const availability =
    subject.availabilityNote ??
    `${subject.label} is not offered for ${level.label}. Choose a ${subject.bands
      .map((b) => bandLabel(b))
      .join(", ")} level, or pick another subject.`;
  return { valid: false, message: availability };
}

/**
 * Apply a level change: drop the subject when it is incompatible with the
 * new level (e.g. JHS subject → user switches to KG).
 */
export function applyLevelChange(
  prev: CurriculumSelection,
  nextLevelId: string
): { selection: CurriculumSelection; clearedSubject: boolean; notice: string | null } {
  const canonicalLevel = resolveLegacyLevelId(nextLevelId) || nextLevelId;
  if (!prev.subjectId) {
    return { selection: { ...prev, levelId: canonicalLevel }, clearedSubject: false, notice: null };
  }
  const check = checkCombination(canonicalLevel, prev.subjectId);
  if (check.valid) {
    return { selection: { ...prev, levelId: canonicalLevel }, clearedSubject: false, notice: null };
  }
  const subject = getSubject(prev.subjectId);
  return {
    selection: { ...prev, levelId: canonicalLevel, subjectId: "" },
    clearedSubject: true,
    notice:
      check.message ??
      `${subject?.label ?? "Subject"} is not available for this level, so it was cleared.`,
  };
}

/**
 * Apply a curriculum change: drop level/subject when they do not belong to
 * the new curriculum.
 */
export function applyCurriculumChange(
  prev: CurriculumSelection,
  nextCurriculumId: string
): { selection: CurriculumSelection; notice: string | null } {
  const levels = getLevelsForCurriculum(nextCurriculumId).map((l) => l.id);
  let { levelId, subjectId } = prev;
  let cleared = false;
  if (levelId && !levels.includes(resolveLegacyLevelId(levelId))) {
    levelId = "";
    subjectId = "";
    cleared = true;
  } else if (subjectId && levelId && !isSubjectAvailableForLevel(subjectId, levelId)) {
    subjectId = "";
    cleared = true;
  }
  return {
    selection: { ...prev, curriculumId: nextCurriculumId, levelId, subjectId },
    notice: cleared ? "Level and subject were reset for the new curriculum." : null,
  };
}

// ---------------------------------------------------------------------------
// Defaults + summary
// ---------------------------------------------------------------------------

export const DEFAULT_CURRICULUM_SELECTION: CurriculumSelection = {
  countryId: "ghana",
  curriculumId: "gh-ccp",
  levelId: "basic-8",
  subjectId: "mathematics",
  strand: "",
  subStrand: "",
  topic: "",
};

export function selectionSummary(selection: CurriculumSelection): string[] {
  const parts: string[] = [];
  const country = getCountry(selection.countryId);
  const curriculum = getCurriculum(selection.curriculumId);
  const level = getLevel(resolveLegacyLevelId(selection.levelId));
  const subject = getSubject(selection.subjectId);
  if (country) parts.push(`${country.flag} ${country.name}`);
  if (curriculum) parts.push(curriculum.label);
  if (level) parts.push(level.label);
  if (subject) parts.push(`${subject.icon} ${subject.label}`);
  return parts;
}

// ---------------------------------------------------------------------------
// Extra context fields (optional, kept from the previous form)
// ---------------------------------------------------------------------------

export interface ExtraContextField {
  id: string;
  label: string;
  placeholder: string;
}

export const EXTRA_CONTEXT_FIELDS: ExtraContextField[] = [
  { id: "classSize", label: "Class size", placeholder: "e.g. 45 learners" },
  { id: "languagePreference", label: "Language preference", placeholder: "e.g. English, Twi support" },
  { id: "learningDifficulties", label: "Learning difficulties", placeholder: "e.g. mixed abilities, dyslexia support" },
  { id: "lessonDuration", label: "Lesson duration", placeholder: "e.g. 60 minutes" },
  { id: "teachingResources", label: "Teaching resources", placeholder: "e.g. chalkboard, cups, printed cards" },
  { id: "schoolContext", label: "School context", placeholder: "e.g. rural public school, limited electricity" },
  { id: "assessmentRequirements", label: "Assessment requirements", placeholder: "e.g. 10-mark quiz with answer key" },
];

export function formatExtraContext(values: Record<string, string>): string {
  return EXTRA_CONTEXT_FIELDS.map((f) => ({ ...f, value: (values[f.id] ?? "").trim() }))
    .filter((f) => f.value)
    .map((f) => `${f.label}: ${f.value}`)
    .join("\n");
}
