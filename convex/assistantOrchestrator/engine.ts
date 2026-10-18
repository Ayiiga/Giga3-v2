import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { requireSession } from "../auth";
import {
  buildExecutionPlan,
  formatPlanSummary,
  type ConnectedProviderMap,
} from "./planner";
import {
  buildReport,
  dependenciesMet,
  derivePlanStatus,
} from "./planState";
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

type InvokeResult = {
  ok?: boolean;
  requiresConfirmation?: boolean;
  pendingActionId?: string;
  summary?: string;
  result?: unknown;
  [key: string]: unknown;
};

type StepTransitionResult =
  | {
      ok: true;
      steps: StoredPlanStep[];
      status: string;
      report: PlanReport;
      revision: number;
    }
  | { ok: false; error: string; status?: string };

async function reloadSteps(
  ctx: { runQuery: Function },
  planId: string
): Promise<StoredPlanStep[]> {
  const row = await ctx.runQuery(internal.assistantOrchestrator.store.getPlanInternal, {
    planId: planId as never,
  });
  if (!row?.stepsJson) return [];
  return JSON.parse(row.stepsJson) as StoredPlanStep[];
}

async function finishStep(
  ctx: { runMutation: Function },
  args: {
    planId: string;
    userId: string;
    stepId: string;
    nextStatus: "completed" | "failed" | "awaiting_confirmation";
    resultSummary?: string;
    error?: string;
    pendingActionId?: string;
    expectedRevision?: number;
  }
): Promise<StepTransitionResult> {
  return (await ctx.runMutation(
    internal.assistantOrchestrator.store.finishPlanStepInternal,
    {
      planId: args.planId as never,
      userId: args.userId,
      stepId: args.stepId,
      expectedStatus: "running",
      nextStatus: args.nextStatus,
      resultSummary: args.resultSummary,
      error: args.error,
      pendingActionId: args.pendingActionId,
      expectedRevision: args.expectedRevision,
    }
  )) as StepTransitionResult;
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

/**
 * Execute ready steps until blocked on confirmation, failure, or completion.
 * Step transitions are atomic server-side mutations — local snapshots are never
 * written back wholesale (prevents stale overwrites under concurrency).
 *
 * Network calls run outside mutations. Interrupted running steps are not
 * blindly retried (provider outcome unknown) — claim only accepts expected states.
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
    if (row.status === "failed") {
      throw new Error("Plan already failed. Create a new plan.");
    }
    if (row.expiresAt < Date.now()) throw new Error("Plan expired. Create a new plan.");

    const connections = await loadConnectionMap(ctx, args.sessionToken);
    const connectedJson = JSON.stringify(
      Object.fromEntries(
        Object.entries(connections).map(([k, v]) => [k, Boolean(v?.connected)])
      )
    );
    const refreshed = (await ctx.runMutation(
      internal.assistantOrchestrator.store.refreshConnectionGatesInternal,
      {
        planId: args.planId,
        userId,
        connectedJson,
      }
    )) as StepTransitionResult;
    if (!refreshed.ok) throw new Error(refreshed.error);

    let steps = refreshed.steps;
    let confirmStepId = args.confirmStepId;
    let pendingActionId = args.pendingActionId;

    let guard = 0;
    while (guard++ < 12) {
      const next = steps.find(
        (s) =>
          (s.status === "pending" || s.status === "ready") &&
          dependenciesMet(s, steps)
      );

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

        const claimed = (await ctx.runMutation(
          internal.assistantOrchestrator.store.claimPlanStepInternal,
          {
            planId: args.planId,
            userId,
            stepId: target.stepId,
            fromStatuses: ["awaiting_confirmation"],
          }
        )) as StepTransitionResult;
        if (!claimed.ok) throw new Error(claimed.error);
        steps = claimed.steps;
        const runningTarget = steps.find((s) => s.stepId === confirmStepId)!;
        const claimRevision = claimed.revision;

        try {
          const result = (await ctx.runAction(api.connectors.operations.invoke, {
            sessionToken: args.sessionToken,
            provider: runningTarget.provider,
            operation: runningTarget.operation,
            params: {},
            confirm: true,
            pendingActionId: boundPendingId,
          })) as InvokeResult;

          if (result.requiresConfirmation) {
            const finished = await finishStep(ctx, {
              planId: args.planId,
              userId,
              stepId: runningTarget.stepId,
              nextStatus: "awaiting_confirmation",
              pendingActionId: String(result.pendingActionId || ""),
              resultSummary: result.summary || "Awaiting confirmation",
              expectedRevision: claimRevision,
            });
            if (!finished.ok) throw new Error(finished.error);
            return {
              ok: true as const,
              paused: true as const,
              awaitingStepId: runningTarget.stepId,
              pendingActionId: String(result.pendingActionId || ""),
              summary: result.summary || "Awaiting confirmation",
              status: finished.status,
              report: finished.report,
              steps: finished.steps,
            };
          }

          const finished = await finishStep(ctx, {
            planId: args.planId,
            userId,
            stepId: runningTarget.stepId,
            nextStatus: "completed",
            resultSummary: summarizeResult(result.result ?? result),
            expectedRevision: claimRevision,
          });
          if (!finished.ok) throw new Error(finished.error);
          steps = finished.steps;
          confirmStepId = undefined;
          pendingActionId = undefined;
        } catch (e) {
          const finished = await finishStep(ctx, {
            planId: args.planId,
            userId,
            stepId: runningTarget.stepId,
            nextStatus: "failed",
            error: e instanceof Error ? e.message : "Step failed",
            expectedRevision: claimRevision,
          });
          if (!finished.ok) {
            // Another writer already moved the step — surface original error.
            throw e instanceof Error ? e : new Error("Step failed");
          }
          return {
            ok: false as const,
            paused: false as const,
            status: finished.status,
            report: finished.report,
            steps: finished.steps,
          };
        }
        continue;
      }

      if (!next) break;

      if (next.requiresConfirmation) {
        if (args.paramOverrides && typeof args.paramOverrides === "object") {
          const applied = (await ctx.runMutation(
            internal.assistantOrchestrator.store.applyStepParamsInternal,
            {
              planId: args.planId,
              userId,
              stepId: next.stepId,
              paramsJson: JSON.stringify(args.paramOverrides),
            }
          )) as StepTransitionResult;
          if (applied.ok) steps = applied.steps;
        }

        const claimed = (await ctx.runMutation(
          internal.assistantOrchestrator.store.claimPlanStepInternal,
          {
            planId: args.planId,
            userId,
            stepId: next.stepId,
            fromStatuses: ["pending", "ready"],
          }
        )) as StepTransitionResult;
        if (!claimed.ok) {
          steps = await reloadSteps(ctx, args.planId);
          continue;
        }
        steps = claimed.steps;
        const staging = steps.find((s) => s.stepId === next.stepId)!;
        const claimRevision = claimed.revision;

        try {
          const staged = (await ctx.runAction(api.connectors.operations.invoke, {
            sessionToken: args.sessionToken,
            provider: staging.provider,
            operation: staging.operation,
            params: staging.params,
            confirm: false,
          })) as InvokeResult;

          if (staged.requiresConfirmation) {
            const finished = await finishStep(ctx, {
              planId: args.planId,
              userId,
              stepId: staging.stepId,
              nextStatus: "awaiting_confirmation",
              pendingActionId: staged.pendingActionId
                ? String(staged.pendingActionId)
                : "",
              resultSummary: staged.summary || staging.title,
              expectedRevision: claimRevision,
            });
            if (!finished.ok) throw new Error(finished.error);
            return {
              ok: true as const,
              paused: true as const,
              awaitingStepId: staging.stepId,
              pendingActionId: staged.pendingActionId
                ? String(staged.pendingActionId)
                : undefined,
              summary: staged.summary || staging.title,
              status: finished.status,
              report: finished.report,
              steps: finished.steps,
            };
          }

          // Unexpected: consequential op ran without staging — record result
          const finished = await finishStep(ctx, {
            planId: args.planId,
            userId,
            stepId: staging.stepId,
            nextStatus: "completed",
            resultSummary: summarizeResult(staged.result ?? staged),
            expectedRevision: claimRevision,
          });
          if (!finished.ok) throw new Error(finished.error);
          steps = finished.steps;
        } catch (e) {
          const finished = await finishStep(ctx, {
            planId: args.planId,
            userId,
            stepId: staging.stepId,
            nextStatus: "failed",
            error: e instanceof Error ? e.message : "Step failed",
            expectedRevision: claimRevision,
          });
          if (!finished.ok) {
            throw e instanceof Error ? e : new Error("Step failed");
          }
          return {
            ok: false as const,
            paused: false as const,
            status: finished.status,
            report: finished.report,
            steps: finished.steps,
          };
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
      )) as StepTransitionResult;
      if (!claimedRead.ok) {
        steps = await reloadSteps(ctx, args.planId);
        continue;
      }
      steps = claimedRead.steps;
      const running = steps.find((s) => s.stepId === next.stepId)!;
      const claimRevision = claimedRead.revision;

      try {
        const result = (await ctx.runAction(api.connectors.operations.invoke, {
          sessionToken: args.sessionToken,
          provider: running.provider,
          operation: running.operation,
          params: running.params,
        })) as InvokeResult;
        const finished = await finishStep(ctx, {
          planId: args.planId,
          userId,
          stepId: running.stepId,
          nextStatus: "completed",
          resultSummary: summarizeResult(result.result ?? result),
          expectedRevision: claimRevision,
        });
        if (!finished.ok) throw new Error(finished.error);
        steps = finished.steps;
      } catch (e) {
        const finished = await finishStep(ctx, {
          planId: args.planId,
          userId,
          stepId: running.stepId,
          nextStatus: "failed",
          error: e instanceof Error ? e.message : "Step failed",
          expectedRevision: claimRevision,
        });
        if (!finished.ok) {
          throw e instanceof Error ? e : new Error("Step failed");
        }
        return {
          ok: false as const,
          paused: false as const,
          status: finished.status,
          report: finished.report,
          steps: finished.steps,
        };
      }
    }

    const report = buildReport(steps);
    const status = derivePlanStatus(steps);
    return {
      ok: report.failedSteps === 0,
      paused: status === "awaiting_confirmation",
      status,
      report,
      steps,
    };
  },
});
