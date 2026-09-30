/**
 * Pure helpers for offline GigaLearn progress reconciliation.
 * Shared by Convex recordAssessment and client-side regression tests.
 */

export type ProgressTimestamps = {
  updatedAt?: number;
  lastAssessedAt?: number;
};

/** True when server progress is newer than the queued offline event. */
export function isOfflineAssessmentStale(
  existing: ProgressTimestamps | null | undefined,
  clientCreatedAt: number | undefined
): boolean {
  if (clientCreatedAt == null || !existing) return false;
  const updatedAt = existing.updatedAt ?? 0;
  const lastAssessedAt = existing.lastAssessedAt ?? 0;
  return updatedAt > clientCreatedAt || lastAssessedAt > clientCreatedAt;
}
