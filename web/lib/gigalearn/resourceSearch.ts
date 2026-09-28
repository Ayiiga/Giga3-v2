/**
 * Phase 2 curriculum-aware educational search over the personal library.
 *
 * "JHS 2 Career Technology materials" understands:
 *   Grade → Basic 8 / JHS 2, Subject → Career Technology, Topic → Materials.
 * Results span lessons, notes, quizzes, worksheets, assignments and videos.
 */
import {
  CURRICULUM_LEVELS,
  CURRICULUM_SUBJECTS,
  getLevel,
  resolveLegacyLevelId,
} from "@/lib/gigalearn/curriculumEngine";

export interface ResourceSearchQuery {
  levelId: string;
  subjectId: string;
  topicKeywords: string[];
  kinds: string[];
  raw: string;
}

const KIND_KEYWORDS: Record<string, string[]> = {
  lesson: ["lesson", "lessons"],
  notes: ["note", "notes"],
  quiz: ["quiz", "quizzes", "test", "tests", "exam", "assessment", "mock"],
  worksheet: ["worksheet", "worksheets"],
  assignment: ["assignment", "assignments", "homework"],
  presentation: ["presentation", "slides", "deck"],
  video: ["video", "videos", "script"],
  flashcard: ["flashcard", "flashcards"],
  practical: ["practical", "project", "demonstration"],
};

export function parseResourceSearch(raw: string): ResourceSearchQuery {
  const text = raw.toLowerCase();
  let levelId = "";
  for (const level of CURRICULUM_LEVELS) {
    const candidates = [level.label.toLowerCase(), level.shortLabel.toLowerCase(), level.gradeLabel.toLowerCase()];
    if (candidates.some((c) => c && text.includes(c))) {
      levelId = level.id;
      break;
    }
  }
  // Legacy shorthands ("jhs 2", "shs 1", "basic 8", "kg 2").
  if (!levelId) {
    const match = text.match(/\b(jhs|shs|basic|kg)\s*(\d)\b/);
    if (match) {
      const [, band, num] = match;
      const n = Number(num);
      if (band === "kg") {
        levelId = n === 1 ? "kg-1" : "kg-2";
      } else if (band === "basic") {
        levelId = resolveLegacyLevelId(`basic-${n}`) || `basic-${n}`;
      } else {
        const base = band === "jhs" ? 6 : 9;
        levelId = `basic-${base + n}`;
      }
      if (!getLevel(levelId)) levelId = "";
    }
  }

  let subjectId = "";
  for (const subject of CURRICULUM_SUBJECTS) {
    if (subject.label.toLowerCase().split(/[\s&]+/).every((w) => w.length < 3 || text.includes(w))) {
      // Require a meaningful hit: full label or a 4+ char word.
      const hit =
        text.includes(subject.label.toLowerCase()) ||
        subject.label
          .toLowerCase()
          .split(/[^a-z]+/)
          .some((w) => w.length >= 4 && text.includes(w));
      if (hit) {
        subjectId = subject.id;
        break;
      }
    }
  }

  const kinds = Object.entries(KIND_KEYWORDS)
    .filter(([, words]) => words.some((w) => text.includes(w)))
    .map(([kind]) => kind);

  const stop = new Set([
    "jhs", "shs", "basic", "kg", "for", "my", "the", "and", "with", "show", "find", "search",
    ...kinds.flatMap((k) => KIND_KEYWORDS[k] ?? []),
    ...(subjectId ? CURRICULUM_SUBJECTS.find((s) => s.id === subjectId)?.label.toLowerCase().split(/[^a-z]+/) ?? [] : []),
    "1", "2", "3",
  ]);
  const topicKeywords = text
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !stop.has(w) && !/^\d+$/.test(w));

  return { levelId, subjectId, topicKeywords, kinds, raw };
}

export interface SearchableResource {
  id: string;
  title: string;
  content: string;
  kind: string;
  toolId: string;
  subjectId?: string;
  levelId?: string;
  topic?: string;
  curriculumId?: string;
  subject?: string;
  level?: string;
  curriculum?: string;
  createdAt: number;
}

function haystack(r: SearchableResource): string {
  return `${r.title} ${r.content.slice(0, 2000)} ${r.topic ?? ""}`.toLowerCase();
}

/** Score a resource against a parsed query (higher is better, 0 = no match). */
export function scoreResource(query: ResourceSearchQuery, resource: SearchableResource): number {
  let score = 0;
  if (query.levelId && (resource.levelId === query.levelId || (resource.level ?? "").toLowerCase().includes(query.levelId.replace("-", " ")))) {
    score += 3;
  }
  if (query.subjectId && (resource.subjectId === query.subjectId)) {
    score += 4;
  } else if (query.subjectId && (resource.subject ?? "").toLowerCase().includes(query.subjectId.replace(/-/g, " ").slice(0, 8))) {
    score += 2;
  }
  if (query.kinds.length && query.kinds.some((k) => resource.kind.includes(k) || resource.toolId.includes(k))) {
    score += 2;
  }
  const hay = haystack(resource);
  for (const word of query.topicKeywords) {
    if (hay.includes(word)) score += 1;
  }
  return score;
}

export function searchResources<T extends SearchableResource>(query: ResourceSearchQuery, resources: T[]): T[] {
  if (!query.levelId && !query.subjectId && !query.kinds.length && !query.topicKeywords.length) {
    return resources;
  }
  return resources
    .map((r) => ({ r, score: scoreResource(query, r) }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((e) => e.r);
}
