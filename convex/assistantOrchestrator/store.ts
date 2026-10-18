import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireSession } from "../auth";
import { sessionArgs } from "../validators";
import type { PlanReport, StoredPlanStep } from "./types";

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
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getPlanInternal = internalQuery({
  args: { planId: v.id("assistantOrchestrationPlans") },
  handler: async (ctx, args) => ctx.db.get(args.planId),
});

export const patchPlanInternal = internalMutation({
  args: {
    planId: v.id("assistantOrchestrationPlans"),
    status: v.optional(
      v.union(
        v.literal("planned"),
        v.literal("awaiting_confirmation"),
        v.literal("running"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("cancelled")
      )
    ),
    stepsJson: v.optional(v.string()),
    reportJson: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.status !== undefined) patch.status = args.status;
    if (args.stepsJson !== undefined) patch.stepsJson = args.stepsJson;
    if (args.reportJson !== undefined) patch.reportJson = args.reportJson;
    await ctx.db.patch(args.planId, patch);
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
      updatedAt: Date.now(),
    });
    return { ok: true as const, status: "cancelled" as const };
  },
});
