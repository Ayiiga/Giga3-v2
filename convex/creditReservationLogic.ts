/**
 * Pure credit-reservation state machine for paid generation.
 * Used by Convex mutations and unit tests — no DB imports.
 */

export type ReservationStatus = "reserved" | "captured" | "released";

export type CreditReservationRecord = {
  requestId: string;
  userId: string;
  action: string;
  amount: number;
  status: ReservationStatus;
  createdAt: number;
  updatedAt: number;
  reference?: string;
  metadata?: string;
};

export type ReserveDecision =
  | { kind: "create" }
  | { kind: "reject_insufficient" }
  | { kind: "reject_in_progress"; reservation: CreditReservationRecord }
  | { kind: "reject_already_completed"; reservation: CreditReservationRecord }
  | { kind: "recover_stale"; reservation: CreditReservationRecord };

export type FinalizeDecision =
  | { kind: "capture"; reservation: CreditReservationRecord }
  | { kind: "release"; reservation: CreditReservationRecord }
  | { kind: "noop_already_captured"; reservation: CreditReservationRecord }
  | { kind: "noop_already_released"; reservation: CreditReservationRecord }
  | { kind: "missing" };

/** Default stale window before an abandoned reservation may be recovered. */
export const CREDIT_RESERVATION_STALE_MS = 15 * 60 * 1000;

export function decideReserve(args: {
  existing: CreditReservationRecord | null;
  balance: number;
  amount: number;
  now: number;
  staleMs?: number;
}): ReserveDecision {
  const amount = args.amount;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { kind: "reject_insufficient" };
  }
  const existing = args.existing;
  if (!existing) {
    return args.balance >= amount ? { kind: "create" } : { kind: "reject_insufficient" };
  }
  if (existing.status === "captured") {
    return { kind: "reject_already_completed", reservation: existing };
  }
  if (existing.status === "released") {
    return args.balance >= amount ? { kind: "create" } : { kind: "reject_insufficient" };
  }
  // reserved
  const staleMs = args.staleMs ?? CREDIT_RESERVATION_STALE_MS;
  if (args.now - existing.createdAt >= staleMs) {
    return { kind: "recover_stale", reservation: existing };
  }
  return { kind: "reject_in_progress", reservation: existing };
}

export function decideCapture(existing: CreditReservationRecord | null): FinalizeDecision {
  if (!existing) return { kind: "missing" };
  if (existing.status === "captured") return { kind: "noop_already_captured", reservation: existing };
  if (existing.status === "released") return { kind: "noop_already_released", reservation: existing };
  return { kind: "capture", reservation: existing };
}

export function decideRelease(existing: CreditReservationRecord | null): FinalizeDecision {
  if (!existing) return { kind: "missing" };
  if (existing.status === "captured") return { kind: "noop_already_captured", reservation: existing };
  if (existing.status === "released") return { kind: "noop_already_released", reservation: existing };
  return { kind: "release", reservation: existing };
}

/**
 * In-memory ledger for concurrency unit tests.
 * Simulates atomic reserve/capture/release against a single-user balance.
 */
export class InMemoryCreditLedger {
  balance: number;
  reservations = new Map<string, CreditReservationRecord>();
  logs: Array<{ action: string; amount: number; balanceAfter: number; requestId: string }> = [];

  constructor(initialBalance: number) {
    this.balance = initialBalance;
  }

  reserve(args: {
    userId: string;
    requestId: string;
    action: string;
    amount: number;
    now: number;
    staleMs?: number;
  }):
    | { ok: true; balanceAfter: number; status: "reserved" }
    | { ok: false; reason: "insufficient" | "in_progress" | "already_completed" } {
    const existing = this.reservations.get(args.requestId) ?? null;
    let decision = decideReserve({
      existing,
      balance: this.balance,
      amount: args.amount,
      now: args.now,
      staleMs: args.staleMs,
    });

    if (decision.kind === "recover_stale") {
      this.release({ requestId: args.requestId, now: args.now });
      decision = decideReserve({
        existing: this.reservations.get(args.requestId) ?? null,
        balance: this.balance,
        amount: args.amount,
        now: args.now,
        staleMs: args.staleMs,
      });
    }

    if (decision.kind === "reject_insufficient") return { ok: false, reason: "insufficient" };
    if (decision.kind === "reject_in_progress") return { ok: false, reason: "in_progress" };
    if (decision.kind === "reject_already_completed") {
      return { ok: false, reason: "already_completed" };
    }

    this.balance -= args.amount;
    const row: CreditReservationRecord = {
      requestId: args.requestId,
      userId: args.userId,
      action: args.action,
      amount: args.amount,
      status: "reserved",
      createdAt: args.now,
      updatedAt: args.now,
    };
    this.reservations.set(args.requestId, row);
    this.logs.push({
      action: args.action,
      amount: -args.amount,
      balanceAfter: this.balance,
      requestId: args.requestId,
    });
    return { ok: true, balanceAfter: this.balance, status: "reserved" };
  }

  capture(args: { requestId: string; now: number }): { ok: boolean; reason?: string } {
    const decision = decideCapture(this.reservations.get(args.requestId) ?? null);
    if (decision.kind === "missing") return { ok: false, reason: "missing" };
    if (decision.kind === "noop_already_captured") return { ok: true };
    if (decision.kind === "noop_already_released") return { ok: false, reason: "already_released" };
    const row = { ...decision.reservation, status: "captured" as const, updatedAt: args.now };
    this.reservations.set(args.requestId, row);
    return { ok: true };
  }

  release(args: { requestId: string; now: number }): { ok: boolean; reason?: string } {
    const decision = decideRelease(this.reservations.get(args.requestId) ?? null);
    if (decision.kind === "missing") return { ok: false, reason: "missing" };
    if (decision.kind === "noop_already_released") return { ok: true };
    if (decision.kind === "noop_already_captured") return { ok: false, reason: "already_captured" };
    this.balance += decision.reservation.amount;
    const row = { ...decision.reservation, status: "released" as const, updatedAt: args.now };
    this.reservations.set(args.requestId, row);
    this.logs.push({
      action: "refund",
      amount: decision.reservation.amount,
      balanceAfter: this.balance,
      requestId: args.requestId,
    });
    return { ok: true };
  }
}

/** Simulate two overlapping generation attempts against a shared ledger. */
export function simulateConcurrentReserves(args: {
  balance: number;
  amount: number;
  requestIds: [string, string];
  now: number;
}): {
  first: ReturnType<InMemoryCreditLedger["reserve"]>;
  second: ReturnType<InMemoryCreditLedger["reserve"]>;
  balance: number;
} {
  const ledger = new InMemoryCreditLedger(args.balance);
  const first = ledger.reserve({
    userId: "user@example.com",
    requestId: args.requestIds[0],
    action: "writing",
    amount: args.amount,
    now: args.now,
  });
  const second = ledger.reserve({
    userId: "user@example.com",
    requestId: args.requestIds[1],
    action: "writing",
    amount: args.amount,
    now: args.now,
  });
  return { first, second, balance: ledger.balance };
}
