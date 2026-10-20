import { describe, expect, it } from "vitest";
import {
  INTERRUPTED_STEP_ERROR,
  InMemoryPlanStore,
  RUNNING_STEP_LEASE_MS,
  claimPlanStep,
  finishPlanStep,
  reconcileInterruptedRunningStep,
  type PlanSnapshot,
} from "../../convex/assistantOrchestrator/planState";
import type { StoredPlanStep } from "../../convex/assistantOrchestrator/types";

function step(
  partial: Partial<StoredPlanStep> & Pick<StoredPlanStep, "stepId" | "status">
): StoredPlanStep {
  return {
    provider: "gmail",
    operation: "list_messages",
    title: partial.stepId,
    params: {},
    requiresConfirmation: false,
    dependsOn: [],
    ...partial,
  };
}

function basePlan(overrides?: Partial<PlanSnapshot>): PlanSnapshot {
  return {
    userId: "user-a",
    status: "planned",
    expiresAt: Date.now() + 60_000,
    revision: 0,
    steps: [
      step({ stepId: "s1", status: "pending", operation: "list_messages" }),
      step({
        stepId: "s2",
        status: "pending",
        operation: "send_email",
        requiresConfirmation: true,
        dependsOn: ["s1"],
      }),
    ],
    ...overrides,
  };
}

describe("assistant plan concurrency / failed-plan guards", () => {
  it("rejects claiming steps on a failed plan", () => {
    const plan = basePlan({
      status: "failed",
      steps: [
        step({ stepId: "s1", status: "failed", error: "boom" }),
        step({ stepId: "s2", status: "pending", dependsOn: ["s1"] }),
      ],
    });
    const result = claimPlanStep(plan, {
      userId: "user-a",
      stepId: "s2",
      fromStatuses: ["pending", "ready"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not executable|failed/i);
  });

  it("rejects failed plans even when confirmStepId-style awaiting step remains", () => {
    const plan = basePlan({
      status: "failed",
      steps: [
        step({ stepId: "s1", status: "failed" }),
        step({
          stepId: "s2",
          status: "awaiting_confirmation",
          requiresConfirmation: true,
          pendingActionId: "pend1",
        }),
      ],
    });
    const result = claimPlanStep(plan, {
      userId: "user-a",
      stepId: "s2",
      fromStatuses: ["awaiting_confirmation"],
    });
    expect(result.ok).toBe(false);
  });

  it("allows only one of two concurrent claims to win", () => {
    const store = new InMemoryPlanStore(basePlan());
    const a = store.claim({
      userId: "user-a",
      stepId: "s1",
      fromStatuses: ["pending", "ready"],
    });
    const b = store.claim({
      userId: "user-a",
      stepId: "s1",
      fromStatuses: ["pending", "ready"],
    });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(false);
    expect(store.get().steps.find((s) => s.stepId === "s1")?.status).toBe("running");
  });

  it("cannot execute a dependent step before its dependency completes", () => {
    const store = new InMemoryPlanStore(basePlan());
    const claimDep = store.claim({
      userId: "user-a",
      stepId: "s2",
      fromStatuses: ["pending", "ready"],
    });
    expect(claimDep.ok).toBe(false);
    if (!claimDep.ok) expect(claimDep.error).toMatch(/depend/i);
  });

  it("stale finish cannot revert a completed step to pending/running", () => {
    const store = new InMemoryPlanStore(basePlan());
    const claimed = store.claim({
      userId: "user-a",
      stepId: "s1",
      fromStatuses: ["pending", "ready"],
    });
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;

    const done = store.finish({
      userId: "user-a",
      stepId: "s1",
      expectedStatus: "running",
      outcome: { nextStatus: "completed", resultSummary: "ok" },
      expectedRevision: claimed.revision,
    });
    expect(done.ok).toBe(true);

    // Stale writer still thinks step is running at an old revision.
    const stale = store.finish({
      userId: "user-a",
      stepId: "s1",
      expectedStatus: "running",
      outcome: { nextStatus: "failed", error: "stale" },
      expectedRevision: claimed.revision,
    });
    expect(stale.ok).toBe(false);
    expect(store.get().steps.find((s) => s.stepId === "s1")?.status).toBe("completed");
  });

  it("two concurrent advances cannot complete the same step twice as separate wins", () => {
    const store = new InMemoryPlanStore(basePlan());
    const c1 = store.claim({
      userId: "user-a",
      stepId: "s1",
      fromStatuses: ["pending", "ready"],
    });
    expect(c1.ok).toBe(true);
    if (!c1.ok) return;

    // Second advance tries to claim the same step — fails.
    const c2 = store.claim({
      userId: "user-a",
      stepId: "s1",
      fromStatuses: ["pending", "ready"],
    });
    expect(c2.ok).toBe(false);

    const f1 = store.finish({
      userId: "user-a",
      stepId: "s1",
      expectedStatus: "running",
      outcome: { nextStatus: "completed", resultSummary: "first" },
      expectedRevision: c1.revision,
    });
    expect(f1.ok).toBe(true);

    // Stale complete from a fictional second claim cannot rewrite history.
    const f2 = finishPlanStep(store.get(), {
      userId: "user-a",
      stepId: "s1",
      expectedStatus: "running",
      outcome: { nextStatus: "completed", resultSummary: "second" },
    });
    expect(f2.ok).toBe(false);
    expect(store.get().steps.find((s) => s.stepId === "s1")?.resultSummary).toBe("first");
  });

  it("rejects cross-user claims", () => {
    const result = claimPlanStep(basePlan(), {
      userId: "user-b",
      stepId: "s1",
      fromStatuses: ["pending"],
    });
    expect(result.ok).toBe(false);
  });

  it("does not claim cancelled or expired plans", () => {
    expect(
      claimPlanStep(basePlan({ status: "cancelled" }), {
        userId: "user-a",
        stepId: "s1",
        fromStatuses: ["pending"],
      }).ok
    ).toBe(false);
    expect(
      claimPlanStep(basePlan({ expiresAt: Date.now() - 1 }), {
        userId: "user-a",
        stepId: "s1",
        fromStatuses: ["pending"],
      }).ok
    ).toBe(false);
  });

  it("reconciles lease-expired running steps to failed without retry", () => {
    const now = Date.now();
    const fresh = reconcileInterruptedRunningStep(
      basePlan({
        status: "running",
        steps: [
          step({
            stepId: "s1",
            status: "running",
            startedAt: now - 1_000,
          }),
        ],
      }),
      { userId: "user-a", stepId: "s1", now, leaseMs: RUNNING_STEP_LEASE_MS }
    );
    expect(fresh.ok).toBe(false);

    const store = new InMemoryPlanStore(
      basePlan({
        status: "running",
        steps: [
          step({
            stepId: "s1",
            status: "running",
            startedAt: now - RUNNING_STEP_LEASE_MS - 1,
          }),
          step({
            stepId: "s2",
            status: "pending",
            requiresConfirmation: true,
            dependsOn: ["s1"],
          }),
        ],
      })
    );
    const reconciled = store.reconcile({
      userId: "user-a",
      stepId: "s1",
      now,
      leaseMs: RUNNING_STEP_LEASE_MS,
    });
    expect(reconciled.ok).toBe(true);
    if (!reconciled.ok) return;
    const s1 = reconciled.steps.find((s) => s.stepId === "s1");
    expect(s1?.status).toBe("failed");
    expect(s1?.error).toBe(INTERRUPTED_STEP_ERROR);
    expect(reconciled.status).toBe("failed");

    // Cannot claim further steps on the failed plan.
    expect(
      store.claim({
        userId: "user-a",
        stepId: "s2",
        fromStatuses: ["pending"],
      }).ok
    ).toBe(false);
  });

  it("does not reconcile a non-running or cross-user step", () => {
    const plan = basePlan({
      status: "running",
      steps: [
        step({
          stepId: "s1",
          status: "running",
          startedAt: Date.now() - RUNNING_STEP_LEASE_MS - 5,
        }),
      ],
    });
    expect(
      reconcileInterruptedRunningStep(plan, {
        userId: "user-b",
        stepId: "s1",
      }).ok
    ).toBe(false);
    expect(
      reconcileInterruptedRunningStep(
        basePlan({
          steps: [step({ stepId: "s1", status: "completed" })],
        }),
        { userId: "user-a", stepId: "s1" }
      ).ok
    ).toBe(false);
  });

  it("blocks claiming while another step is within its running lease", () => {
    const now = Date.now();
    const plan = basePlan({
      status: "running",
      steps: [
        step({
          stepId: "s1",
          status: "running",
          startedAt: now - 1_000,
        }),
        step({
          stepId: "s2",
          status: "pending",
          operation: "list_messages",
          dependsOn: [],
        }),
      ],
    });
    const result = claimPlanStep(plan, {
      userId: "user-a",
      stepId: "s2",
      fromStatuses: ["pending", "ready"],
      now,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/still running/i);
  });
});
