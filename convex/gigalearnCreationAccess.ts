/**
 * GigaLearn Create templates are available to signed-in users with writing
 * credits. They are not Creator Studio subscriptions. Keep the allowlist
 * explicit so an arbitrary toolId cannot bypass the existing paid feature gate.
 *
 * Every allowed request still passes requireSessionWithMonitoring and the
 * atomic 2-credit writing reservation in gigalearnStudio.generateContent.
 */
export const GIGALEARN_CREATION_TOOL_IDS = [
  "creation-lesson",
  "creation-research",
  "creation-book",
  "creation-cv",
  "creation-rhyme",
  "creation-quiz",
] as const;

const creationToolIds: ReadonlySet<string> = new Set(GIGALEARN_CREATION_TOOL_IDS);

export function isGigaLearnCreationToolId(toolId: string): boolean {
  return creationToolIds.has(toolId);
}

/** All other tool IDs retain the existing Creator Studio entitlement check. */
export function requiresCreatorStudioEntitlement(toolId: string): boolean {
  return !isGigaLearnCreationToolId(toolId);
}
