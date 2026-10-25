/**
 * Pure authZ / validation helpers for GigaSocial Awards (unit-tested).
 */

import { normalizeComponentScore } from "./gigaSocialAwardsMath";

/** Only the linked nominee may accept or decline. Unlinked nominations are not claimable. */
export function assertCanRespondToNomination(args: {
  actorUserId: string;
  nomineeUserId?: string | null;
}): void {
  if (!args.nomineeUserId) {
    throw new Error(
      "This nomination is not linked to a GigaSocial account. Nominate by handle so the nominee can consent."
    );
  }
  if (args.nomineeUserId !== args.actorUserId) {
    throw new Error("Only the nominee can respond.");
  }
}

const FORMULA_LOCK_STATUSES = new Set([
  "voting_open",
  "judging",
  "finalists_published",
  "results_published",
  "archived",
]);

export function seasonStatusLocksFormula(status: string): boolean {
  return FORMULA_LOCK_STATUSES.has(status);
}

/** Parse and clamp rubric JSON (dimension → 0–100). Rejects non-objects / non-finite values. */
export function parseAndClampRubricScores(scoresJson: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(scoresJson);
  } catch {
    throw new Error("scoresJson must be a JSON object.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("scoresJson must be a JSON object.");
  }
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    const dim = key.trim().slice(0, 64);
    if (!dim) continue;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`Score for "${dim}" must be a finite number.`);
    }
    out[dim] = normalizeComponentScore(value);
  }
  if (Object.keys(out).length === 0) {
    throw new Error("Provide at least one rubric score.");
  }
  return JSON.stringify(out);
}

export function secureRandomToken(prefix = "", length = 24): string {
  const bytes = new Uint8Array(Math.max(16, Math.ceil(length * 0.75)));
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const body = hex.slice(0, length);
  return prefix ? `${prefix}${body}` : body;
}
