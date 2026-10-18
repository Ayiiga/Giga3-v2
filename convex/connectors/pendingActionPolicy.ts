/**
 * Pure pending-action claim / confirm policy (unit-tested).
 * Mutations in store.ts must stay aligned with this logic.
 */

export type PendingActionRow = {
  userId: string;
  provider: string;
  actionType: string;
  payloadJson: string;
  summary: string;
  status: "pending" | "confirmed" | "cancelled" | "executed" | "failed";
  resultJson?: string;
  expiresAt: number;
};

export type PendingClaimOk = {
  ok: true;
  payloadJson: string;
  summary: string;
  nextStatus: "confirmed";
};

export type PendingClaimFail = {
  ok: false;
  error: string;
  alreadyExecuted?: boolean;
  resultJson?: string;
  /** When expired, caller should mark row cancelled. */
  markCancelled?: boolean;
};

export function evaluatePendingClaim(
  row: PendingActionRow | null | undefined,
  args: {
    userId: string;
    provider: string;
    actionType: string;
    now?: number;
  }
): PendingClaimOk | PendingClaimFail {
  if (!row || row.userId !== args.userId) {
    return { ok: false, error: "Pending action not found." };
  }
  if (row.provider !== args.provider || row.actionType !== args.actionType) {
    return { ok: false, error: "Pending action mismatch." };
  }
  if (row.status === "executed") {
    return {
      ok: false,
      error: "Pending action already executed.",
      alreadyExecuted: true,
      resultJson: row.resultJson,
    };
  }
  if (row.status === "cancelled") {
    return { ok: false, error: "Pending action was cancelled." };
  }
  if (row.status === "failed") {
    return { ok: false, error: "Pending action already failed." };
  }
  if (row.status === "confirmed") {
    return {
      ok: false,
      error: "Pending action is already being executed.",
    };
  }
  if (row.status !== "pending") {
    return { ok: false, error: "Pending action is no longer valid." };
  }
  const now = args.now ?? Date.now();
  if (row.expiresAt < now) {
    return {
      ok: false,
      error: "Pending action expired. Stage it again.",
      markCancelled: true,
    };
  }
  return {
    ok: true,
    payloadJson: row.payloadJson,
    summary: row.summary,
    nextStatus: "confirmed",
  };
}

/** Confirm must use staged payload only — never merge client params. */
export function lockedPayloadFromClaim(claim: PendingClaimOk): Record<string, unknown> {
  return JSON.parse(claim.payloadJson) as Record<string, unknown>;
}
