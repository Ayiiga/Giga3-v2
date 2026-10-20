/**
 * Legacy Create sub-destinations (Media Studio / GigaEdits) are retired in Phase 2.
 * Kept as an empty module surface so imports remain stable; CreateSubNav renders nothing.
 */

export type CreateSubDestinationId = never;

export type CreateSubDestination = {
  id: CreateSubDestinationId;
  label: string;
  shortLabel: string;
  href: string;
  description: string;
};

/** Empty — dedicated Create destinations removed for education-first navigation. */
export const CREATE_SUB_DESTINATIONS: CreateSubDestination[] = [];

export function resolveCreateSubDestination(_pathname: string): CreateSubDestinationId | null {
  return null;
}

export function isCreateSubRoute(_pathname: string): boolean {
  return false;
}
