/**
 * Phase 2 active curriculum-context persistence.
 *
 * Once the user selects Ghana → Common Core → Basic 8 → Career Technology →
 * Strand → Sub-strand → Topic, that context is maintained across lesson,
 * quiz, assignment, worksheet, revision, video and presentation generation.
 * Validation reuses the Phase 1 smart-validation system — incompatible
 * combinations can never persist.
 */
import {
  applyCurriculumChange,
  applyLevelChange,
  checkCombination,
  DEFAULT_CURRICULUM_SELECTION,
  getCountry,
  getCurriculum,
  getCurriculaForCountry,
  getLevel,
  getLevelsForCurriculum,
  getSubject,
  resolveLegacyLevelId,
  selectionSummary,
  type CurriculumSelection,
} from "@/lib/gigalearn/curriculumEngine";
import { getGigaLearnProfile } from "@/lib/gigalearn/profile";
import type { TeachingMethodologyId } from "@/lib/gigalearn/methodologies";

export interface StudioContext extends CurriculumSelection {
  contentStandard: string;
  indicator: string;
  /** Selected Early Years teaching methods (optional — auto-pick when empty). */
  methodologyIds: TeachingMethodologyId[];
  updatedAt: number;
}

const STUDIO_CONTEXT_KEY = "giga3_gigalearn_studio_context";

const DEFAULT_STUDIO_CONTEXT: StudioContext = {
  ...DEFAULT_CURRICULUM_SELECTION,
  contentStandard: "",
  indicator: "",
  methodologyIds: [],
  updatedAt: 0,
};

function sanitize(raw: Partial<StudioContext>): StudioContext {
  const next: StudioContext = {
    ...DEFAULT_STUDIO_CONTEXT,
    ...raw,
    methodologyIds: Array.isArray(raw.methodologyIds) ? raw.methodologyIds : [],
    updatedAt: Date.now(),
  };
  // Reuse Phase 1 smart validation: drop anything incompatible.
  const curricula = getCurriculaForCountry(next.countryId);
  if (!curricula.some((c) => c.id === next.curriculumId)) {
    const fallback = curricula[0]?.id ?? DEFAULT_STUDIO_CONTEXT.curriculumId;
    const reset = applyCurriculumChange({ ...next, curriculumId: fallback }, fallback);
    return {
      ...reset.selection,
      contentStandard: next.contentStandard,
      indicator: next.indicator,
      methodologyIds: next.methodologyIds,
      updatedAt: Date.now(),
    };
  }
  const levels = getLevelsForCurriculum(next.curriculumId).map((l) => l.id);
  const canonicalLevel = resolveLegacyLevelId(next.levelId);
  if (next.levelId && !levels.includes(canonicalLevel)) {
    return { ...next, levelId: "", subjectId: "", updatedAt: Date.now() };
  }
  if (next.levelId) next.levelId = canonicalLevel;
  if (next.subjectId && next.levelId && !checkCombination(next.levelId, next.subjectId).valid) {
    const reset = applyLevelChange(next, next.levelId);
    return {
      ...reset.selection,
      contentStandard: next.contentStandard,
      indicator: next.indicator,
      methodologyIds: next.methodologyIds,
      updatedAt: Date.now(),
    };
  }
  return next;
}

function readStored(): StudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STUDIO_CONTEXT_KEY);
    if (!raw) return null;
    return sanitize(JSON.parse(raw) as Partial<StudioContext>);
  } catch {
    return null;
  }
}

function fromProfile(): StudioContext {
  try {
    const profile = getGigaLearnProfile();
    return sanitize({
      ...DEFAULT_CURRICULUM_SELECTION,
      levelId: resolveLegacyLevelId(profile.level) || DEFAULT_CURRICULUM_SELECTION.levelId,
      subjectId: profile.subjects[0] ?? DEFAULT_CURRICULUM_SELECTION.subjectId,
    });
  } catch {
    return { ...DEFAULT_STUDIO_CONTEXT };
  }
}

/** Active context, persisted across every Phase 2 workflow. */
export function getStudioContext(): StudioContext {
  return readStored() ?? fromProfile();
}

export function saveStudioContext(patch: Partial<StudioContext>): StudioContext {
  const next = sanitize({ ...getStudioContext(), ...patch });
  try {
    localStorage.setItem(STUDIO_CONTEXT_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
  return next;
}

export function clearStudioContext(): StudioContext {
  const next: StudioContext = { ...DEFAULT_STUDIO_CONTEXT, updatedAt: Date.now() };
  try {
    localStorage.removeItem(STUDIO_CONTEXT_KEY);
  } catch {
    /* ignore */
  }
  return next;
}

export interface StudioContextValidation {
  valid: boolean;
  issues: string[];
}

/** Quality-control gate: every level of the hierarchy must exist and fit. */
export function validateStudioContext(ctx: StudioContext): StudioContextValidation {
  const issues: string[] = [];
  if (!getCountry(ctx.countryId)) issues.push("Country is not set.");
  const curriculum = getCurriculum(ctx.curriculumId);
  if (!curriculum) {
    issues.push("Curriculum is not set.");
  } else if (curriculum.countryId !== ctx.countryId) {
    issues.push("Curriculum does not belong to the selected country.");
  }
  const level = getLevel(resolveLegacyLevelId(ctx.levelId));
  if (!ctx.levelId || !level) {
    issues.push("Education level is not set.");
  } else {
    if (level.curriculumId !== ctx.curriculumId) issues.push("Grade is not part of the selected curriculum.");
    const subject = getSubject(ctx.subjectId);
    if (!ctx.subjectId || !subject) {
      issues.push("Subject is not set.");
    } else if (!checkCombination(level.id, subject.id).valid) {
      issues.push(`${subject.label} is not compatible with ${level.label}.`);
    }
  }
  return { valid: issues.length === 0, issues };
}

/** Breadcrumb parts for the persistent context bar. */
export function studioContextSummary(ctx: StudioContext): string[] {
  const parts = selectionSummary(ctx);
  if (ctx.strand.trim()) parts.push(ctx.strand.trim());
  if (ctx.subStrand.trim()) parts.push(ctx.subStrand.trim());
  if (ctx.topic.trim()) parts.push(ctx.topic.trim());
  return parts;
}

/** Stable curriculum IDs for progress analytics (not display names). */
export function studioContextIds(ctx: StudioContext): {
  countryId: string;
  curriculumId: string;
  levelId: string;
  gradeId: string;
  subjectId: string;
  strand: string;
  subStrand: string;
  topic: string;
  contentStandard: string;
  indicator: string;
} {
  const level = getLevel(resolveLegacyLevelId(ctx.levelId));
  return {
    countryId: ctx.countryId,
    curriculumId: ctx.curriculumId,
    levelId: resolveLegacyLevelId(ctx.levelId),
    gradeId: level?.gradeLabel ?? "",
    subjectId: ctx.subjectId,
    strand: ctx.strand.trim(),
    subStrand: ctx.subStrand.trim(),
    topic: ctx.topic.trim(),
    contentStandard: ctx.contentStandard.trim(),
    indicator: ctx.indicator.trim(),
  };
}

/** Server topic key built from IDs so analytics survive display renames. */
export function studioTopicKey(ctx: StudioContext): string {
  const ids = studioContextIds(ctx);
  return [ids.curriculumId, ids.subjectId, ids.levelId, ids.topic || ids.strand]
    .filter(Boolean)
    .join("/")
    .toLowerCase()
    .slice(0, 120);
}
