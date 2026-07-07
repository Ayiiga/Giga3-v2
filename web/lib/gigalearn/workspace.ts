export type LearningArtifactKind =
  | "quiz"
  | "assignment"
  | "notes"
  | "study-plan"
  | "worksheet"
  | "other";

export interface LearningArtifact {
  id: string;
  kind: LearningArtifactKind;
  toolId: string;
  title: string;
  prompt: string;
  content: string;
  curriculum?: string;
  subject?: string;
  level?: string;
  favorite: boolean;
  createdAt: number;
}

export interface LearningPromptHistoryEntry {
  id: string;
  toolId: string;
  prompt: string;
  curriculum?: string;
  subject?: string;
  createdAt: number;
}

export interface LearningAchievement {
  id: string;
  label: string;
  description: string;
  earnedAt: number;
}

export interface LearningProgressSnapshot {
  totalGenerations: number;
  quizzesCompleted: number;
  studyPlansCreated: number;
  lessonsCreated: number;
  subjectsStudied: Record<string, number>;
  streakDays: number;
  lastActiveDate: string | null;
  achievements: LearningAchievement[];
  dailyCounts: Record<string, number>;
  lastGenerationAt: number | null;
  dailyLimit: number;
}

const ARTIFACTS_KEY = "giga3_gigalearn_artifacts";
const PROMPTS_KEY = "giga3_gigalearn_prompt_history";
const PROGRESS_KEY = "giga3_gigalearn_progress";
const DAILY_LIMIT = 60;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function artifactKindForTool(toolId: string): LearningArtifactKind {
  if (toolId.includes("quiz")) return "quiz";
  if (toolId.includes("assignment")) return "assignment";
  if (toolId.includes("lesson")) return "notes";
  if (toolId.includes("study-plan")) return "study-plan";
  if (toolId.includes("worksheet")) return "worksheet";
  return "other";
}

const ACHIEVEMENT_DEFS: Array<{
  id: string;
  label: string;
  description: string;
  check: (p: LearningProgressSnapshot) => boolean;
}> = [
  {
    id: "first_quiz",
    label: "First quiz",
    description: "Generated your first practice quiz",
    check: (p) => p.totalGenerations >= 1,
  },
  {
    id: "quiz_master",
    label: "Quiz explorer",
    description: "Created 5 learning materials",
    check: (p) => p.totalGenerations >= 5,
  },
  {
    id: "study_streak_3",
    label: "3-day streak",
    description: "Studied three days in a row",
    check: (p) => p.streakDays >= 3,
  },
  {
    id: "study_streak_7",
    label: "Week warrior",
    description: "Seven-day learning streak",
    check: (p) => p.streakDays >= 7,
  },
  {
    id: "multi_subject",
    label: "Multi-subject learner",
    description: "Studied three or more subjects",
    check: (p) => Object.keys(p.subjectsStudied).length >= 3,
  },
];

function defaultProgress(): LearningProgressSnapshot {
  return {
    totalGenerations: 0,
    quizzesCompleted: 0,
    studyPlansCreated: 0,
    lessonsCreated: 0,
    subjectsStudied: {},
    streakDays: 0,
    lastActiveDate: null,
    achievements: [],
    dailyCounts: {},
    lastGenerationAt: null,
    dailyLimit: DAILY_LIMIT,
  };
}

function updateStreak(progress: LearningProgressSnapshot): LearningProgressSnapshot {
  const today = todayKey();
  if (progress.lastActiveDate === today) return progress;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  let streakDays = 1;
  if (progress.lastActiveDate === yesterdayKey) {
    streakDays = progress.streakDays + 1;
  }

  return { ...progress, streakDays, lastActiveDate: today };
}

function syncAchievements(progress: LearningProgressSnapshot): LearningAchievement[] {
  const existing = new Set(progress.achievements.map((a) => a.id));
  const earned = [...progress.achievements];
  const now = Date.now();

  for (const def of ACHIEVEMENT_DEFS) {
    if (!existing.has(def.id) && def.check(progress)) {
      earned.push({
        id: def.id,
        label: def.label,
        description: def.description,
        earnedAt: now,
      });
    }
  }

  return earned;
}

export function listArtifacts(): LearningArtifact[] {
  return readJson<LearningArtifact[]>(ARTIFACTS_KEY, []).sort(
    (a, b) => b.createdAt - a.createdAt
  );
}

export function saveArtifact(
  entry: Omit<LearningArtifact, "id" | "createdAt" | "favorite" | "kind"> & {
    favorite?: boolean;
    kind?: LearningArtifactKind;
  }
): LearningArtifact {
  const artifact: LearningArtifact = {
    ...entry,
    kind: entry.kind ?? artifactKindForTool(entry.toolId),
    id: `l_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    favorite: entry.favorite ?? false,
    createdAt: Date.now(),
  };
  const next = [artifact, ...listArtifacts()].slice(0, 150);
  writeJson(ARTIFACTS_KEY, next);
  return artifact;
}

export function toggleArtifactFavorite(id: string): void {
  const next = listArtifacts().map((a) =>
    a.id === id ? { ...a, favorite: !a.favorite } : a
  );
  writeJson(ARTIFACTS_KEY, next);
}

export function removeArtifact(id: string): void {
  writeJson(
    ARTIFACTS_KEY,
    listArtifacts().filter((a) => a.id !== id)
  );
}

export function listPromptHistory(): LearningPromptHistoryEntry[] {
  return readJson<LearningPromptHistoryEntry[]>(PROMPTS_KEY, []).sort(
    (a, b) => b.createdAt - a.createdAt
  );
}

export function recordPromptHistory(entry: {
  toolId: string;
  prompt: string;
  curriculum?: string;
  subject?: string;
}): void {
  const row: LearningPromptHistoryEntry = {
    id: `lp_${Date.now()}`,
    toolId: entry.toolId,
    prompt: entry.prompt.trim().slice(0, 2000),
    curriculum: entry.curriculum,
    subject: entry.subject,
    createdAt: Date.now(),
  };
  const next = [row, ...listPromptHistory().filter((p) => p.prompt !== row.prompt)].slice(
    0,
    50
  );
  writeJson(PROMPTS_KEY, next);
}

export function getProgressSnapshot(): LearningProgressSnapshot {
  return { ...defaultProgress(), ...readJson<Partial<LearningProgressSnapshot>>(PROGRESS_KEY, defaultProgress()) };
}

export function canGenerateToday(): boolean {
  const progress = getProgressSnapshot();
  const today = todayKey();
  return (progress.dailyCounts[today] ?? 0) < progress.dailyLimit;
}

export function recordLearningActivity(args: {
  toolId: string;
  subject?: string;
  creditsUsed?: number;
}): LearningProgressSnapshot {
  let progress = getProgressSnapshot();
  progress = updateStreak(progress);

  const today = todayKey();
  const dailyCounts = { ...progress.dailyCounts };
  dailyCounts[today] = (dailyCounts[today] ?? 0) + 1;

  const subjectsStudied = { ...progress.subjectsStudied };
  if (args.subject) {
    subjectsStudied[args.subject] = (subjectsStudied[args.subject] ?? 0) + 1;
  }

  const next: LearningProgressSnapshot = {
    ...progress,
    totalGenerations: progress.totalGenerations + 1,
    quizzesCompleted:
      progress.quizzesCompleted + (args.toolId.includes("quiz") ? 1 : 0),
    studyPlansCreated:
      progress.studyPlansCreated + (args.toolId.includes("study-plan") ? 1 : 0),
    lessonsCreated:
      progress.lessonsCreated + (args.toolId.includes("lesson") ? 1 : 0),
    subjectsStudied,
    dailyCounts,
    lastGenerationAt: Date.now(),
    dailyLimit: DAILY_LIMIT,
  };

  next.achievements = syncAchievements(next);
  writeJson(PROGRESS_KEY, next);
  return next;
}
