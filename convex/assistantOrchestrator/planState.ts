/**
 * Pure plan / step transition helpers for assistant orchestration.
 * Mutations re-read DB state and apply these — never trust a client snapshot.
 */

import type { PlanReport, PlanStepStatus, StoredPlanStep } from "./types";

export type PlanStatus =
  | "planned"
  | "awaiting_confirmation"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type PlanSnapshot = {
  userId: string;
  status: PlanStatus;
  steps: StoredPlanStep[];
  expiresAt: number;
  revision: number;
};

export type TransitionFail = { ok: false; error: string; status?: string };
export type TransitionOk = {
  ok: true;
  steps: StoredPlanStep[];
  status: PlanStatus;
  report: PlanReport;
  revision: number;
};

const TERMINAL_PLAN: ReadonlySet<PlanStatus> = new Set([
  "cancelled",
  "completed",
  "failed",
]);

/**
 * Running-step lease. After this, the step may be reconciled as interrupted.
 * Never auto-retry the external operation — outcome is unknown.
 */
export const RUNNING_STEP_LEASE_MS = 15 * 60 * 1000;

export const INTERRUPTED_STEP_ERROR =
  "Interrupted: provider outcome unknown. Create a new plan to retry.";

export function isRunningStepLeaseExpired(
  step: StoredPlanStep,
  now: number,
  leaseMs: number = RUNNING_STEP_LEASE_MS
): boolean {
  if (step.status !== "running") return false;
  if (typeof step.startedAt !== "number") return true;
  return now - step.startedAt >= leaseMs;
}

export function buildReport(steps: StoredPlanStep[]): PlanReport {
  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const failedSteps = steps.filter((s) => s.status === "failed").length;
  const blockedSteps = steps.filter((s) => s.status === "blocked").length;
  const awaitingConfirmation = steps.filter(
    (s) => s.status === "awaiting_confirmation"
  ).length;
  const lines = steps.map((s) => {
    const mark =
      s.status === "completed"
        ? "✓"
        : s.status === "failed"
          ? "✗"
          : s.status === "awaiting_confirmation"
            ? "…"
            : s.status === "blocked"
              ? "⊘"
              : "·";
    return `${mark} ${s.title}${s.error ? ` (${s.error})` : ""}${
      s.resultSummary ? ` → ${s.resultSummary.slice(0, 120)}` : ""
    }`;
  });
  return {
    ok: failedSteps === 0 && blockedSteps === 0 && awaitingConfirmation === 0,
    completedSteps,
    failedSteps,
    blockedSteps,
    awaitingConfirmation,
    lines,
    generatedAt: Date.now(),
  };
}

export function derivePlanStatus(steps: StoredPlanStep[]): PlanStatus {
  // Any failed step terminalises the plan — confirmStepId cannot resume it.
  // Retries require creating a new plan (explicit), not silent re-entry.
  if (steps.some((s) => s.status === "failed")) {
    return "failed";
  }
  if (steps.some((s) => s.status === "awaiting_confirmation")) {
    return "awaiting_confirmation";
  }
  if (
    steps.length > 0 &&
    steps.every(
      (s) =>
        s.status === "completed" || s.status === "skipped" || s.status === "blocked"
    )
  ) {
    if (steps.every((s) => s.status === "blocked")) return "failed";
    if (steps.some((s) => s.status === "blocked")) return "failed";
    return "completed";
  }
  if (steps.some((s) => s.status === "completed" || s.status === "running")) {
    return "running";
  }
  return "planned";
}

export function dependenciesMet(
  step: StoredPlanStep,
  steps: StoredPlanStep[]
): boolean {
  return step.dependsOn.every((dep) => {
    const parent = steps.find((s) => s.stepId === dep);
    return parent?.status === "completed";
  });
}

function cloneSteps(steps: StoredPlanStep[]): StoredPlanStep[] {
  return steps.map((s) => ({ ...s, params: { ...s.params }, dependsOn: [...s.dependsOn] }));
}

function assertExecutablePlan(
  plan: PlanSnapshot,
  now: number
): TransitionFail | null {
  if (TERMINAL_PLAN.has(plan.status)) {
    return { ok: false, error: `Plan is not executable (status=${plan.status}).` };
  }
  // Defend against a stale plan.status that omitted a failed step.
  if (plan.steps.some((s) => s.status === "failed")) {
    return { ok: false, error: "Plan is not executable (status=failed)." };
  }
  if (plan.expiresAt < now) {
    return { ok: false, error: "Plan expired. Create a new plan." };
  }
  return null;
}

function finalize(
  steps: StoredPlanStep[],
  revision: number
): TransitionOk {
  const status = derivePlanStatus(steps);
  return {
    ok: true,
    steps,
    status,
    report: buildReport(steps),
    revision: revision + 1,
  };
}

/** Claim a step for execution (expected statuses → running). */
export function claimPlanStep(
  plan: PlanSnapshot,
  args: {
    userId: string;
    stepId: string;
    fromStatuses: PlanStepStatus[];
    now?: number;
  }
): TransitionOk | TransitionFail {
  if (plan.userId !== args.userId) {
    return { ok: false, error: "Plan not found." };
  }
  const now = args.now ?? Date.now();
  const blocked = assertExecutablePlan(plan, now);
  if (blocked) return blocked;

  const steps = cloneSteps(plan.steps);
  const step = steps.find((s) => s.stepId === args.stepId);
  if (!step) return { ok: false, error: "Unknown step." };

  if (!args.fromStatuses.includes(step.status)) {
    return {
      ok: false,
      error: `Step is not claimable (status=${step.status}).`,
      status: step.status,
    };
  }

  if (!dependenciesMet(step, steps)) {
    return { ok: false, error: "Step dependencies are not completed." };
  }

  // Block new claims while another step is still within its running lease.
  const activeRunner = steps.find(
    (s) =>
      s.stepId !== args.stepId &&
      s.status === "running" &&
      !isRunningStepLeaseExpired(s, now)
  );
  if (activeRunner) {
    return {
      ok: false,
      error: "Another step is still running. Wait or reconcile after the lease expires.",
      status: activeRunner.status,
    };
  }

  step.status = "running";
  step.startedAt = now;
  step.error = undefined;
  return finalize(steps, plan.revision);
}

export type FinishStepOutcome =
  | {
      nextStatus: "completed";
      resultSummary: string;
    }
  | {
      nextStatus: "failed";
      error: string;
      resultSummary?: string;
    }
  | {
      nextStatus: "awaiting_confirmation";
      pendingActionId: string;
      resultSummary: string;
    };

/**
 * Finish a running step. Re-validates expectedStatus against the current snapshot
 * so a stale writer cannot overwrite completed/failed/awaiting state.
 */
export function finishPlanStep(
  plan: PlanSnapshot,
  args: {
    userId: string;
    stepId: string;
    expectedStatus: PlanStepStatus;
    outcome: FinishStepOutcome;
    now?: number;
    /** Optional CAS — reject if plan.revision !== expectedRevision. */
    expectedRevision?: number;
  }
): TransitionOk | TransitionFail {
  if (plan.userId !== args.userId) {
    return { ok: false, error: "Plan not found." };
  }
  if (plan.status === "cancelled") {
    return { ok: false, error: "Plan was cancelled." };
  }
  if (args.expectedRevision !== undefined && plan.revision !== args.expectedRevision) {
    return { ok: false, error: "Plan revision conflict." };
  }

  const steps = cloneSteps(plan.steps);
  const step = steps.find((s) => s.stepId === args.stepId);
  if (!step) return { ok: false, error: "Unknown step." };

  if (step.status !== args.expectedStatus) {
    return {
      ok: false,
      error: `Step state conflict (status=${step.status}).`,
      status: step.status,
    };
  }

  const now = args.now ?? Date.now();
  const outcome = args.outcome;
  if (outcome.nextStatus === "completed") {
    step.status = "completed";
    step.completedAt = now;
    step.resultSummary = outcome.resultSummary;
    step.error = undefined;
  } else if (outcome.nextStatus === "failed") {
    step.status = "failed";
    step.completedAt = now;
    step.error = outcome.error;
    if (outcome.resultSummary) step.resultSummary = outcome.resultSummary;
  } else {
    step.status = "awaiting_confirmation";
    step.pendingActionId = outcome.pendingActionId;
    step.resultSummary = outcome.resultSummary;
    step.error = undefined;
  }

  return finalize(steps, plan.revision);
}

/** Refresh blocked↔pending from live connection map — never touch terminal/running steps. */
export function refreshConnectionGates(
  plan: PlanSnapshot,
  args: {
    userId: string;
    connected: Record<string, boolean>;
    now?: number;
  }
): TransitionOk | TransitionFail {
  if (plan.userId !== args.userId) {
    return { ok: false, error: "Plan not found." };
  }
  const now = args.now ?? Date.now();
  const blocked = assertExecutablePlan(plan, now);
  if (blocked) return blocked;

  const steps = cloneSteps(plan.steps);
  let changed = false;
  for (const step of steps) {
    const isConnected = Boolean(args.connected[step.provider]);
    if (step.status === "blocked" && isConnected) {
      step.status = "pending";
      step.error = undefined;
      changed = true;
    } else if (step.status === "pending" && !isConnected) {
      step.status = "blocked";
      step.error = `${step.provider} is not connected`;
      changed = true;
    }
  }
  if (!changed) {
    return {
      ok: true,
      steps,
      status: plan.status,
      report: buildReport(steps),
      revision: plan.revision,
    };
  }
  return finalize(steps, plan.revision);
}

/**
 * Reconcile an interrupted running step to failed without retrying the provider.
 * Only allowed after the running lease expires (or startedAt is missing).
 */
export function reconcileInterruptedRunningStep(
  plan: PlanSnapshot,
  args: {
    userId: string;
    stepId: string;
    now?: number;
    leaseMs?: number;
    expectedRevision?: number;
  }
): TransitionOk | TransitionFail {
  if (plan.userId !== args.userId) {
    return { ok: false, error: "Plan not found." };
  }
  if (plan.status === "cancelled" || plan.status === "completed") {
    return { ok: false, error: `Plan is not reconciliable (status=${plan.status}).` };
  }
  if (args.expectedRevision !== undefined && plan.revision !== args.expectedRevision) {
    return { ok: false, error: "Plan revision conflict." };
  }

  const now = args.now ?? Date.now();
  const leaseMs = args.leaseMs ?? RUNNING_STEP_LEASE_MS;
  const steps = cloneSteps(plan.steps);
  const step = steps.find((s) => s.stepId === args.stepId);
  if (!step) return { ok: false, error: "Unknown step." };
  if (step.status !== "running") {
    return {
      ok: false,
      error: `Step is not running (status=${step.status}).`,
      status: step.status,
    };
  }
  if (!isRunningStepLeaseExpired(step, now, leaseMs)) {
    return {
      ok: false,
      error: "Step lease has not expired. Wait before reconciling.",
      status: step.status,
    };
  }

  step.status = "failed";
  step.completedAt = now;
  step.error = INTERRUPTED_STEP_ERROR;
  step.resultSummary = "interrupted_unknown_outcome";
  return finalize(steps, plan.revision);
}

/** Merge params into a pending/ready step before staging (never after confirmation). */
export function applyStepParamOverrides(
  plan: PlanSnapshot,
  args: {
    userId: string;
    stepId: string;
    params: Record<string, unknown>;
    now?: number;
  }
): TransitionOk | TransitionFail {
  if (plan.userId !== args.userId) {
    return { ok: false, error: "Plan not found." };
  }
  const now = args.now ?? Date.now();
  const blocked = assertExecutablePlan(plan, now);
  if (blocked) return blocked;

  const steps = cloneSteps(plan.steps);
  const step = steps.find((s) => s.stepId === args.stepId);
  if (!step) return { ok: false, error: "Unknown step." };
  if (step.status !== "pending" && step.status !== "ready") {
    return {
      ok: false,
      error: `Cannot override params (status=${step.status}).`,
      status: step.status,
    };
  }
  step.params = { ...step.params, ...args.params };
  return finalize(steps, plan.revision);
}

/**
 * In-memory concurrency simulator for regression tests.
 * Models Convex mutation serialisation: each transition applies to the latest snapshot.
 */
export class InMemoryPlanStore {
  private plan: PlanSnapshot;

  constructor(plan: PlanSnapshot) {
    this.plan = {
      ...plan,
      steps: cloneSteps(plan.steps),
    };
  }

  get(): PlanSnapshot {
    return {
      ...this.plan,
      steps: cloneSteps(this.plan.steps),
    };
  }

  claim(args: {
    userId: string;
    stepId: string;
    fromStatuses: PlanStepStatus[];
    now?: number;
  }) {
    const result = claimPlanStep(this.plan, args);
    if (result.ok) {
      this.plan = {
        ...this.plan,
        steps: result.steps,
        status: result.status,
        revision: result.revision,
      };
    }
    return result;
  }

  finish(args: {
    userId: string;
    stepId: string;
    expectedStatus: PlanStepStatus;
    outcome: FinishStepOutcome;
    now?: number;
    expectedRevision?: number;
  }) {
    const result = finishPlanStep(this.plan, args);
    if (result.ok) {
      this.plan = {
        ...this.plan,
        steps: result.steps,
        status: result.status,
        revision: result.revision,
      };
    }
    return result;
  }

  reconcile(args: {
    userId: string;
    stepId: string;
    now?: number;
    leaseMs?: number;
    expectedRevision?: number;
  }) {
    const result = reconcileInterruptedRunningStep(this.plan, args);
    if (result.ok) {
      this.plan = {
        ...this.plan,
        steps: result.steps,
        status: result.status,
        revision: result.revision,
      };
    }
    return result;
  }
}
