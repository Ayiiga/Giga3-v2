import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireSession } from "../auth";
import { sessionArgs } from "../validators";
import {
  applyStepParamOverrides,
  claimPlanStep,
  finishPlanStep,
  refreshConnectionGates,
  type FinishStepOutcome,
  type PlanSnapshot,
  type PlanStatus,
} from "./planState";
import type { PlanReport, PlanStepStatus, StoredPlanStep } from "./types";

function parseSteps(stepsJson: string): StoredPlanStep[] {
  return JSON.parse(stepsJson) as StoredPlanStep[];
}

function toSnapshot(row: {
  userId: string;
  status: PlanStatus;
  stepsJson: string;
  expiresAt: number;
  revision?: number;
}): PlanSnapshot {
  return {
    userId: row.userId,
    status: row.status,
    steps: parseSteps(row.stepsJson),
    expiresAt: row.expiresAt,
    revision: row.revision ?? 0,
  };
}

async function persistTransition(
  ctx: { db: { patch: Function } },
  planId: unknown,
  result: {
    steps: StoredPlanStep[];
    status: PlanStatus;
    report: PlanReport;
    revision: number;
  }
) {
  await ctx.db.patch(planId, {
    status: result.status,
    stepsJson: JSON.stringify(result.steps),
    reportJson: JSON.stringify(result.report),
    revision: result.revision,
    updatedAt: Date.now(),
  });
}

export const insertPlanInternal = internalMutation({
  args: {
    userId: v.string(),
    goal: v.string(),
    intent: v.string(),
    status: v.union(
      v.literal("planned"),
      v.literal("awaiting_confirmation"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    stepsJson: v.string(),
    missingHintsJson: v.string(),
    notesJson: v.string(),
    conversationId: v.optional(v.string()),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("assistantOrchestrationPlans", {
      ...args,
      revision: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getPlanInternal = internalQuery({
  args: { planId: v.id("assistantOrchestrationPlans") },
  handler: async (ctx, args) => ctx.db.get(args.planId),
});

/**
 * Atomically claim a plan step for execution (pending/ready/awaiting → running).
 * Rejects cancelled, completed, failed, and expired plans at this boundary.
 */
export const claimPlanStepInternal = internalMutation({
  args: {
    planId: v.id("assistantOrchestrationPlans"),
    userId: v.string(),
    stepId: v.string(),
    fromStatuses: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.planId);
    if (!row || row.userId !== args.userId) {
      return { ok: false as const, error: "Plan not found." };
    }
    let result;
    try {
      result = claimPlanStep(toSnapshot(row as never), {
        userId: args.userId,
        stepId: args.stepId,
        fromStatuses: args.fromStatuses as PlanStepStatus[],
      });
    } catch {
      return { ok: false as const, error: "Plan steps are corrupt." };
    }
    if (!result.ok) return result;
    await persistTransition(ctx, args.planId, result);
    return {
      ok: true as const,
      steps: result.steps,
      status: result.status,
      report: result.report,
      revision: result.revision,
    };
  },
});

/**
 * Atomically finish a running step. Re-reads current plan so stale snapshots
 * cannot overwrite newer completed/failed/awaiting state.
 */
export const finishPlanStepInternal = internalMutation({
  args: {
    planId: v.id("assistantOrchestrationPlans"),
    userId: v.string(),
    stepId: v.string(),
    expectedStatus: v.string(),
    nextStatus: v.union(
      v.literal("completed"),
      v.literal("failed"),
      v.literal("awaiting_confirmation")
    ),
    resultSummary: v.optional(v.string()),
    error: v.optional(v.string()),
    pendingActionId: v.optional(v.string()),
    expectedRevision: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.planId);
    if (!row || row.userId !== args.userId) {
      return { ok: false as const, error: "Plan not found." };
    }

    let outcome: FinishStepOutcome;
    if (args.nextStatus === "completed") {
      outcome = {
        nextStatus: "completed",
        resultSummary: args.resultSummary || "ok",
      };
    } else if (args.nextStatus === "failed") {
      outcome = {
        nextStatus: "failed",
        error: args.error || "Step failed",
        resultSummary: args.resultSummary,
      };
    } else {
      if (!args.pendingActionId) {
        return { ok: false as const, error: "pendingActionId is required." };
      }
      outcome = {
        nextStatus: "awaiting_confirmation",
        pendingActionId: args.pendingActionId,
        resultSummary: args.resultSummary || "Awaiting confirmation",
      };
    }

    let result;
    try {
      result = finishPlanStep(toSnapshot(row as never), {
        userId: args.userId,
        stepId: args.stepId,
        expectedStatus: args.expectedStatus as PlanStepStatus,
        outcome,
        expectedRevision: args.expectedRevision,
      });
    } catch {
      return { ok: false as const, error: "Plan steps are corrupt." };
    }
    if (!result.ok) return result;
    await persistTransition(ctx, args.planId, result);
    return {
      ok: true as const,
      steps: result.steps,
      status: result.status,
      report: result.report,
      revision: result.revision,
    };
  },
});

export const refreshConnectionGatesInternal = internalMutation({
  args: {
    planId: v.id("assistantOrchestrationPlans"),
    userId: v.string(),
    connectedJson: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.planId);
    if (!row || row.userId !== args.userId) {
      return { ok: false as const, error: "Plan not found." };
    }
    let connected: Record<string, boolean>;
    try {
      connected = JSON.parse(args.connectedJson) as Record<string, boolean>;
    } catch {
      return { ok: false as const, error: "Invalid connection map." };
    }
    let result;
    try {
      result = refreshConnectionGates(toSnapshot(row as never), {
        userId: args.userId,
        connected,
      });
    } catch {
      return { ok: false as const, error: "Plan steps are corrupt." };
    }
    if (!result.ok) return result;
    if (result.revision !== (row.revision ?? 0)) {
      await persistTransition(ctx, args.planId, result);
    }
    return {
      ok: true as const,
      steps: result.steps,
      status: result.status,
      report: result.report,
      revision: result.revision,
    };
  },
});

export const applyStepParamsInternal = internalMutation({
  args: {
    planId: v.id("assistantOrchestrationPlans"),
    userId: v.string(),
    stepId: v.string(),
    paramsJson: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.planId);
    if (!row || row.userId !== args.userId) {
      return { ok: false as const, error: "Plan not found." };
    }
    let params: Record<string, unknown>;
    try {
      params = JSON.parse(args.paramsJson) as Record<string, unknown>;
    } catch {
      return { ok: false as const, error: "Invalid params." };
    }
    let result;
    try {
      result = applyStepParamOverrides(toSnapshot(row as never), {
        userId: args.userId,
        stepId: args.stepId,
        params,
      });
    } catch {
      return { ok: false as const, error: "Plan steps are corrupt." };
    }
    if (!result.ok) return result;
    await persistTransition(ctx, args.planId, result);
    return {
      ok: true as const,
      steps: result.steps,
      status: result.status,
      report: result.report,
      revision: result.revision,
    };
  },
});

function publicPlanView(row: {
  _id: string;
  userId: string;
  goal: string;
  intent: string;
  status: string;
  stepsJson: string;
  missingHintsJson: string;
  notesJson: string;
  reportJson?: string;
  conversationId?: string;
  expiresAt: number;
  revision?: number;
  createdAt: number;
  updatedAt: number;
}) {
  let steps: StoredPlanStep[] = [];
  let missingHints: string[] = [];
  let notes: string[] = [];
  let report: PlanReport | null = null;
  try {
    steps = JSON.parse(row.stepsJson) as StoredPlanStep[];
  } catch {
    /* ignore */
  }
  try {
    missingHints = JSON.parse(row.missingHintsJson) as string[];
  } catch {
    /* ignore */
  }
  try {
    notes = JSON.parse(row.notesJson) as string[];
  } catch {
    /* ignore */
  }
  if (row.reportJson) {
    try {
      report = JSON.parse(row.reportJson) as PlanReport;
    } catch {
      report = null;
    }
  }
  return {
    planId: row._id,
    goal: row.goal,
    intent: row.intent,
    status: row.status,
    steps,
    missingHints,
    notes,
    report,
    conversationId: row.conversationId ?? null,
    expiresAt: row.expiresAt,
    revision: row.revision ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const getPlan = query({
  args: {
    ...sessionArgs,
    planId: v.id("assistantOrchestrationPlans"),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken, ctx);
    const row = await ctx.db.get(args.planId);
    if (!row || row.userId !== userId) return null;
    return publicPlanView(row);
  },
});

export const listRecentPlans = query({
  args: {
    ...sessionArgs,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken, ctx);
    const rows = await ctx.db
      .query("assistantOrchestrationPlans")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .take(Math.min(20, Math.max(1, args.limit ?? 8)));
    return rows.map(publicPlanView);
  },
});

export const cancelPlan = mutation({
  args: {
    ...sessionArgs,
    planId: v.id("assistantOrchestrationPlans"),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken, ctx);
    const row = await ctx.db.get(args.planId);
    if (!row || row.userId !== userId) throw new Error("Plan not found.");
    if (row.status === "completed" || row.status === "cancelled") {
      return { ok: true as const, status: row.status };
    }
    const steps = JSON.parse(row.stepsJson) as StoredPlanStep[];
    for (const step of steps) {
      if (
        step.status === "pending" ||
        step.status === "ready" ||
        step.status === "awaiting_confirmation" ||
        step.status === "running"
      ) {
        step.status = "skipped";
      }
    }
    await ctx.db.patch(row._id, {
      status: "cancelled",
      stepsJson: JSON.stringify(steps),
      revision: (row.revision ?? 0) + 1,
      updatedAt: Date.now(),
    });
    return { ok: true as const, status: "cancelled" as const };
  },
});
