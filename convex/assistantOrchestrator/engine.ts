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
 */
export const advancePlan = action({
  args: {
    sessionToken: v.string(),
    planId: v.id("assistantOrchestrationPlans"),
    confirmStepId: v.optional(v.string()),
    pendingActionId: v.optional(v.string()),
    /** Optional param overrides for the confirmed step (e.g. fill startIso). */
    paramOverrides: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken, ctx);
    const row = await ctx.runQuery(internal.assistantOrchestrator.store.getPlanInternal, {
      planId: args.planId,
    });
    if (!row || row.userId !== userId) throw new Error("Plan not found.");
    if (row.status === "cancelled") throw new Error("Plan was cancelled.");
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
        if (args.paramOverrides && typeof args.paramOverrides === "object") {
          target.params = {
            ...target.params,
            ...(args.paramOverrides as Record<string, unknown>),
          };
        }

        target.status = "running";
        target.startedAt = Date.now();
        await persist(ctx, args.planId, steps);

        try {
          const result = (await ctx.runAction(api.connectors.operations.invoke, {
            sessionToken: args.sessionToken,
            provider: target.provider,
            operation: target.operation,
            params: target.params,
            confirm: true,
            pendingActionId: pendingActionId || target.pendingActionId,
          })) as InvokeResult;

          if (result.requiresConfirmation) {
            target.status = "awaiting_confirmation";
            target.pendingActionId = String(result.pendingActionId || "");
            target.resultSummary = result.summary || "Awaiting confirmation";
            const saved = await persist(ctx, args.planId, steps);
            return {
              ok: true as const,
              paused: true as const,
              awaitingStepId: target.stepId,
              pendingActionId: target.pendingActionId,
              summary: target.resultSummary,
              ...saved,
              steps,
            };
          }

          target.status = "completed";
          target.completedAt = Date.now();
          target.resultSummary = summarizeResult(result.result ?? result);
          target.error = undefined;
          confirmStepId = undefined;
          pendingActionId = undefined;
        } catch (e) {
          target.status = "failed";
          target.completedAt = Date.now();
          target.error = e instanceof Error ? e.message : "Step failed";
          const saved = await persist(ctx, args.planId, steps);
          return { ok: false as const, paused: false as const, ...saved, steps };
        }
        continue;
      }

      if (!next) break;

      if (next.requiresConfirmation) {
        // Stage via invoke without confirm to get pendingActionId
        next.status = "running";
        next.startedAt = Date.now();
        await persist(ctx, args.planId, steps);
        try {
          const staged = (await ctx.runAction(api.connectors.operations.invoke, {
            sessionToken: args.sessionToken,
            provider: next.provider,
            operation: next.operation,
            params: next.params,
            confirm: false,
          })) as InvokeResult;

          if (staged.requiresConfirmation) {
            next.status = "awaiting_confirmation";
            next.pendingActionId = staged.pendingActionId
              ? String(staged.pendingActionId)
              : undefined;
            next.resultSummary = staged.summary || next.title;
            const saved = await persist(ctx, args.planId, steps);
            return {
              ok: true as const,
              paused: true as const,
              awaitingStepId: next.stepId,
              pendingActionId: next.pendingActionId,
              summary: next.resultSummary,
              ...saved,
              steps,
            };
          }

          // Unexpected: consequential op ran without staging — record result
          next.status = "completed";
          next.completedAt = Date.now();
          next.resultSummary = summarizeResult(staged.result ?? staged);
        } catch (e) {
          next.status = "failed";
          next.completedAt = Date.now();
          next.error = e instanceof Error ? e.message : "Step failed";
          const saved = await persist(ctx, args.planId, steps);
          return { ok: false as const, paused: false as const, ...saved, steps };
        }
        continue;
      }

      // Auto-run read-only / non-confirm step
      next.status = "running";
      next.startedAt = Date.now();
      await persist(ctx, args.planId, steps);
      try {
        const result = (await ctx.runAction(api.connectors.operations.invoke, {
          sessionToken: args.sessionToken,
          provider: next.provider,
          operation: next.operation,
          params: next.params,
        })) as InvokeResult;
        next.status = "completed";
        next.completedAt = Date.now();
        next.resultSummary = summarizeResult(result.result ?? result);
      } catch (e) {
        next.status = "failed";
        next.completedAt = Date.now();
        next.error = e instanceof Error ? e.message : "Step failed";
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
