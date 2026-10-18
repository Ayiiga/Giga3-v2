import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { requireSession } from "../auth";
import {
  buildExecutionPlan,
  formatPlanSummary,
  type ConnectedProviderMap,
} from "./planner";
import type { PlanReport, StoredPlanStep } from "./types";

const PLAN_TTL_MS = 60 * 60 * 1000;

function summarizeResult(result: unknown): string {
  if (result == null) return "ok";
  try {
    const s = JSON.stringify(result);
    return s.length > 800 ? `${s.slice(0, 800)}…` : s;
  } catch {
    return "ok";
  }
}

function buildReport(steps: StoredPlanStep[]): PlanReport {
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

function derivePlanStatus(
  steps: StoredPlanStep[]
): "planned" | "awaiting_confirmation" | "running" | "completed" | "failed" {
  if (steps.some((s) => s.status === "failed")) {
    // Still awaiting confirmation elsewhere? Prefer awaiting if any.
    if (steps.some((s) => s.status === "awaiting_confirmation")) {
      return "awaiting_confirmation";
    }
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

async function loadConnectionMap(
  ctx: { runQuery: (ref: unknown, args: unknown) => Promise<unknown> },
  sessionToken: string
): Promise<ConnectedProviderMap> {
  const status = (await ctx.runQuery(api.connectors.status.listConnectorStatuses, {
    sessionToken,
  })) as {
    cards: Array<{ id: string; status: string; accountLabel?: string | null }>;
  };
  const map: ConnectedProviderMap = {};
  for (const card of status.cards) {
    if (
      card.id === "google_drive" ||
      card.id === "gmail" ||
      card.id === "outlook_calendar" ||
      card.id === "zoom" ||
      card.id === "moodle" ||
      card.id === "notion"
    ) {
      map[card.id] = {
        connected: card.status === "connected",
        accountLabel: card.accountLabel,
      };
    }
  }
  return map;
}

function dependenciesMet(step: StoredPlanStep, steps: StoredPlanStep[]): boolean {
  return step.dependsOn.every((dep) => {
    const parent = steps.find((s) => s.stepId === dep);
    return parent?.status === "completed";
  });
}

/** Create a structured plan from natural language (no provider side effects). */
export const createPlan = action({
  args: {
    sessionToken: v.string(),
    request: v.string(),
    conversationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken, ctx);
    const connections = await loadConnectionMap(ctx, args.sessionToken);
    const draft = buildExecutionPlan(args.request, connections);
    const steps: StoredPlanStep[] = draft.steps.map((s) => ({
      ...s,
      status: connections[s.provider]?.connected ? "pending" : "blocked",
      error: connections[s.provider]?.connected
        ? undefined
        : `${s.provider} is not connected`,
    }));

    const initialStatus = derivePlanStatus(steps);
    const planId = await ctx.runMutation(
      internal.assistantOrchestrator.store.insertPlanInternal,
      {
        userId,
        goal: draft.goal,
        intent: draft.intent,
        status: initialStatus === "completed" ? "planned" : initialStatus,
        stepsJson: JSON.stringify(steps),
        missingHintsJson: JSON.stringify(draft.missingHints),
        notesJson: JSON.stringify(draft.notes),
        conversationId: args.conversationId,
        expiresAt: Date.now() + PLAN_TTL_MS,
      }
    );

    return {
      planId,
      summary: formatPlanSummary(draft),
      intent: draft.intent,
      steps,
      missingHints: draft.missingHints,
      notes: draft.notes,
      needsConfirmation: steps.some((s) => s.requiresConfirmation),
    };
  },
});

type InvokeResult = {
  ok?: boolean;
  requiresConfirmation?: boolean;
  pendingActionId?: string;
  summary?: string;
  result?: unknown;
  files?: unknown;
  messages?: unknown;
  events?: unknown;
  meetings?: unknown;
  courses?: unknown;
  results?: unknown;
  text?: string;
  [key: string]: unknown;
};

async function persist(
  ctx: { runMutation: Function },
  planId: string,
  steps: StoredPlanStep[]
) {
  const status = derivePlanStatus(steps);
  const report = buildReport(steps);
  await ctx.runMutation(internal.assistantOrchestrator.store.patchPlanInternal, {
    planId: planId as never,
    status,
    stepsJson: JSON.stringify(steps),
    reportJson: JSON.stringify(report),
  });
  return { status, report };
}

/**
 * Execute ready steps until blocked on confirmation, failure, or completion.
 * Pass `confirmStepId` + optional `pendingActionId` to approve a consequential step.
 * Confirmation executes the staged pending payload only — client paramOverrides are ignored.
 */
export const advancePlan = action({
  args: {
    sessionToken: v.string(),
    planId: v.id("assistantOrchestrationPlans"),
    confirmStepId: v.optional(v.string()),
    pendingActionId: v.optional(v.string()),
    /**
     * Allowed only while a step is still pending/ready (before staging).
     * Ignored once a step is awaiting confirmation so confirm cannot change action details.
     */
    paramOverrides: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken, ctx);
    const row = await ctx.runQuery(internal.assistantOrchestrator.store.getPlanInternal, {
      planId: args.planId,
    });
    if (!row || row.userId !== userId) throw new Error("Plan not found.");
    if (row.status === "cancelled") throw new Error("Plan was cancelled.");
    if (row.status === "completed") throw new Error("Plan already completed.");
    if (row.status === "failed" && !args.confirmStepId) {
      throw new Error("Plan already failed. Create a new plan.");
    }
    if (row.expiresAt < Date.now()) throw new Error("Plan expired. Create a new plan.");

    const steps = JSON.parse(row.stepsJson) as StoredPlanStep[];
    const connections = await loadConnectionMap(ctx, args.sessionToken);
    let confirmStepId = args.confirmStepId;
    let pendingActionId = args.pendingActionId;

    // Refresh blocked→pending if user connected since planning.
    for (const step of steps) {
      if (step.status === "blocked" && connections[step.provider]?.connected) {
        step.status = "pending";
        step.error = undefined;
      }
      if (!connections[step.provider]?.connected && step.status === "pending") {
        step.status = "blocked";
        step.error = `${step.provider} is not connected`;
      }
    }

    let guard = 0;
    while (guard++ < 12) {
      const next = steps.find(
        (s) =>
          (s.status === "pending" || s.status === "ready") &&
          dependenciesMet(s, steps)
      );

      // Confirm path for a specific awaiting step
      if (confirmStepId) {
        const target = steps.find((s) => s.stepId === confirmStepId);
        if (!target) throw new Error("Unknown step to confirm.");
        if (!target.requiresConfirmation) {
          throw new Error("This step does not require confirmation.");
        }
        if (target.status === "completed") {
          throw new Error("Step already completed.");
        }
        if (target.status === "failed") {
          throw new Error("Step already failed.");
        }
        if (target.status === "skipped") {
          throw new Error("Step was skipped.");
        }
        if (target.status !== "awaiting_confirmation") {
          throw new Error(
            "Step is not awaiting confirmation. Advance the plan to stage it first."
          );
        }
        const boundPendingId = pendingActionId || target.pendingActionId;
        if (!boundPendingId) {
          throw new Error("pendingActionId is required to confirm this step.");
        }
        // Do not apply paramOverrides after staging — confirm binds to locked payload.

        const claimed = (await ctx.runMutation(
          internal.assistantOrchestrator.store.claimPlanStepInternal,
          {
            planId: args.planId,
            userId,
            stepId: target.stepId,
            fromStatuses: ["awaiting_confirmation"],
          }
        )) as
          | { ok: true; steps: StoredPlanStep[] }
          | { ok: false; error: string; status?: string };
        if (!claimed.ok) throw new Error(claimed.error);
        steps.splice(0, steps.length, ...claimed.steps);
        const runningTarget = steps.find((s) => s.stepId === confirmStepId)!;

        try {
          const result = (await ctx.runAction(api.connectors.operations.invoke, {
            sessionToken: args.sessionToken,
            provider: runningTarget.provider,
            operation: runningTarget.operation,
            // Params ignored on confirm; server uses staged payloadJson.
            params: {},
            confirm: true,
            pendingActionId: boundPendingId,
          })) as InvokeResult;

          if (result.requiresConfirmation) {
            runningTarget.status = "awaiting_confirmation";
            runningTarget.pendingActionId = String(result.pendingActionId || "");
            runningTarget.resultSummary = result.summary || "Awaiting confirmation";
            const saved = await persist(ctx, args.planId, steps);
            return {
              ok: true as const,
              paused: true as const,
              awaitingStepId: runningTarget.stepId,
              pendingActionId: runningTarget.pendingActionId,
              summary: runningTarget.resultSummary,
              ...saved,
              steps,
            };
          }

          runningTarget.status = "completed";
          runningTarget.completedAt = Date.now();
          runningTarget.resultSummary = summarizeResult(result.result ?? result);
          runningTarget.error = undefined;
          confirmStepId = undefined;
          pendingActionId = undefined;
        } catch (e) {
          runningTarget.status = "failed";
          runningTarget.completedAt = Date.now();
          runningTarget.error = e instanceof Error ? e.message : "Step failed";
          const saved = await persist(ctx, args.planId, steps);
          return { ok: false as const, paused: false as const, ...saved, steps };
        }
        continue;
      }

      if (!next) break;

      if (next.requiresConfirmation) {
        // Optional pre-stage param fill (e.g. startIso) — only before confirmation staging.
        if (args.paramOverrides && typeof args.paramOverrides === "object") {
          next.params = {
            ...next.params,
            ...(args.paramOverrides as Record<string, unknown>),
          };
          await persist(ctx, args.planId, steps);
        }
        const claimed = (await ctx.runMutation(
          internal.assistantOrchestrator.store.claimPlanStepInternal,
          {
            planId: args.planId,
            userId,
            stepId: next.stepId,
            fromStatuses: ["pending", "ready"],
          }
        )) as
          | { ok: true; steps: StoredPlanStep[] }
          | { ok: false; error: string };
        if (!claimed.ok) {
          // Another advance claimed this step — reload and continue.
          const refreshed = await ctx.runQuery(
            internal.assistantOrchestrator.store.getPlanInternal,
            { planId: args.planId }
          );
          if (refreshed?.stepsJson) {
            steps.splice(
              0,
              steps.length,
              ...(JSON.parse(refreshed.stepsJson) as StoredPlanStep[])
            );
          }
          continue;
        }
        steps.splice(0, steps.length, ...claimed.steps);
        const staging = steps.find((s) => s.stepId === next.stepId)!;
        try {
          const staged = (await ctx.runAction(api.connectors.operations.invoke, {
            sessionToken: args.sessionToken,
            provider: staging.provider,
            operation: staging.operation,
            params: staging.params,
            confirm: false,
          })) as InvokeResult;

          if (staged.requiresConfirmation) {
            staging.status = "awaiting_confirmation";
            staging.pendingActionId = staged.pendingActionId
              ? String(staged.pendingActionId)
              : undefined;
            staging.resultSummary = staged.summary || staging.title;
            const saved = await persist(ctx, args.planId, steps);
            return {
              ok: true as const,
              paused: true as const,
              awaitingStepId: staging.stepId,
              pendingActionId: staging.pendingActionId,
              summary: staging.resultSummary,
              ...saved,
              steps,
            };
          }

          // Unexpected: consequential op ran without staging — record result
          staging.status = "completed";
          staging.completedAt = Date.now();
          staging.resultSummary = summarizeResult(staged.result ?? staged);
        } catch (e) {
          staging.status = "failed";
          staging.completedAt = Date.now();
          staging.error = e instanceof Error ? e.message : "Step failed";
          const saved = await persist(ctx, args.planId, steps);
          return { ok: false as const, paused: false as const, ...saved, steps };
        }
        continue;
      }

      // Auto-run read-only / non-confirm step
      const claimedRead = (await ctx.runMutation(
        internal.assistantOrchestrator.store.claimPlanStepInternal,
        {
          planId: args.planId,
          userId,
          stepId: next.stepId,
          fromStatuses: ["pending", "ready"],
        }
      )) as { ok: true; steps: StoredPlanStep[] } | { ok: false; error: string };
      if (!claimedRead.ok) {
        const refreshed = await ctx.runQuery(
          internal.assistantOrchestrator.store.getPlanInternal,
          { planId: args.planId }
        );
        if (refreshed?.stepsJson) {
          steps.splice(
            0,
            steps.length,
            ...(JSON.parse(refreshed.stepsJson) as StoredPlanStep[])
          );
        }
        continue;
      }
      steps.splice(0, steps.length, ...claimedRead.steps);
      const running = steps.find((s) => s.stepId === next.stepId)!;
      try {
        const result = (await ctx.runAction(api.connectors.operations.invoke, {
          sessionToken: args.sessionToken,
          provider: running.provider,
          operation: running.operation,
          params: running.params,
        })) as InvokeResult;
        running.status = "completed";
        running.completedAt = Date.now();
        running.resultSummary = summarizeResult(result.result ?? result);
      } catch (e) {
        running.status = "failed";
        running.completedAt = Date.now();
        running.error = e instanceof Error ? e.message : "Step failed";
        const saved = await persist(ctx, args.planId, steps);
        return { ok: false as const, paused: false as const, ...saved, steps };
      }
    }

    const saved = await persist(ctx, args.planId, steps);
    return {
      ok: saved.report.failedSteps === 0,
      paused: saved.status === "awaiting_confirmation",
      ...saved,
      steps,
    };
  },
});
