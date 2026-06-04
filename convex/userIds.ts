/** Canonical user id for Convex tables (email). */
export function normalizeUserId(userId: string): string {
  return userId.trim().toLowerCase();
}
