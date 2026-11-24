import type { WorldId } from "./worldChecks";

const DAY_MS = 86_400_000;
const REVIEW_DAYS = [1, 3, 7, 14, 30];
const STORE_PREFIX = "giga3_gigalearn_world_review:v1";

export type WorldReview = {
  stage: number;
  dueAt: number;
  nextVariant: number;
};

/** An independent due check advances the interval. A miss or use of a hint calls for more practice. */
export function nextWorldReview(
  previous: WorldReview | null,
  result: { correct: boolean; usedHint: boolean },
  now = Date.now(),
): WorldReview {
  if (result.correct && !result.usedHint && previous && now < previous.dueAt) return previous;
  const independent = result.correct && !result.usedHint;
  const stage = independent ? Math.min((previous?.stage ?? -1) + 1, REVIEW_DAYS.length - 1) : -1;
  return {
    stage,
    dueAt: stage < 0 ? now : now + REVIEW_DAYS[stage]! * DAY_MS,
    nextVariant: ((previous?.nextVariant ?? 0) + 1) % 2,
  };
}

function reviewKey(owner: string, world: WorldId): string {
  return `${STORE_PREFIX}:${owner}:${world}`;
}

export function loadWorldReview(owner: string, world: WorldId): WorldReview | null {
  try {
    const stored = localStorage.getItem(reviewKey(owner, world));
    if (!stored) return null;
    const record: WorldReview = JSON.parse(stored);
    if (
      !record || !Number.isInteger(record.stage) || record.stage < -1 || record.stage >= REVIEW_DAYS.length ||
      !Number.isFinite(record.dueAt) || (record.nextVariant !== 0 && record.nextVariant !== 1)
    ) return null;
    return record;
  } catch {
    return null;
  }
}

export function saveWorldReview(owner: string, world: WorldId, record: WorldReview): boolean {
  try {
    localStorage.setItem(reviewKey(owner, world), JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}
