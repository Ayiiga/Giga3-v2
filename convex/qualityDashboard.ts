import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { sanitizeFeedbackNote } from "./attachmentValidation";
import { RateLimitError } from "./securityErrors";

const responseModeValidator = v.union(
  v.literal("conversational"),
  v.literal("educational"),
  v.literal("high_stakes")
);

const confidenceLabelValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high")
);

const FEEDBACK_WINDOW_MS = 60 * 60 * 1000;
const MAX_FEEDBACK_PER_USER_PER_HOUR = 12;
const MAX_ANON_FEEDBACK_PER_IP_PER_HOUR = 6;
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

function utcDateKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function ensureAdminAccess(adminKey: string): void {
  const requiredKey = process.env.QUALITY_DASHBOARD_ADMIN_KEY?.trim();
  if (!requiredKey || adminKey !== requiredKey) {
    throw new Error("Unauthorized");
  }
}

async function enforceRateLimit(
  ctx: { db: any },
  bucketKey: string,
  maxPerWindow: number
): Promise<void> {
  const now = Date.now();
  const existing = await ctx.db
    .query("feedbackRateLimits")
    .withIndex("by_bucket", (q: any) => q.eq("bucketKey", bucketKey))
    .first();

  if (!existing || now - existing.windowStartMs >= FEEDBACK_WINDOW_MS) {
    if (existing) {
      await ctx.db.patch(existing._id, { windowStartMs: now, count: 1 });
    } else {
      await ctx.db.insert("feedbackRateLimits", {
        bucketKey,
        windowStartMs: now,
        count: 1,
      });
    }
    return;
  }

  if (existing.count >= maxPerWindow) {
    console.warn("[security.feedback] rate limit exceeded", { bucketKey });
    throw new RateLimitError();
  }

  await ctx.db.patch(existing._id, { count: existing.count + 1 });
}

async function rejectDuplicateFeedback(
  ctx: { db: any },
  userId: string | undefined,
  satisfactionScore: number,
  usefulnessScore: number,
  note: string | undefined
): Promise<void> {
  const since = Date.now() - DUPLICATE_WINDOW_MS;
  const recent = await ctx.db
    .query("qualityFeedback")
    .withIndex("by_dateKey")
    .order("desc")
    .take(40);

  const duplicate = recent.find(
    (row: {
      userId?: string;
      satisfactionScore: number;
      usefulnessScore: number;
      note?: string;
      createdAt: number;
    }) =>
      row.createdAt >= since &&
      row.userId === userId &&
      row.satisfactionScore === satisfactionScore &&
      row.usefulnessScore === usefulnessScore &&
      (row.note ?? "") === (note ?? "")
  );
  if (duplicate) {
    throw new RateLimitError("Duplicate feedback");
  }
}

export const recordResponseMetric = internalMutation({
  args: {
    responseMode: responseModeValidator,
    confidenceLabel: confidenceLabelValidator,
    citationCount: v.number(),
    verificationVisible: v.boolean(),
    verificationPassed: v.boolean(),
    hasHallucinationRisk: v.boolean(),
    createdAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const ts = args.createdAt ?? Date.now();
    const dateKey = utcDateKey(ts);
    const existing = await ctx.db
      .query("qualityMetricsDaily")
      .withIndex("by_dateKey", (q) => q.eq("dateKey", dateKey))
      .first();

    const patch = {
      totalResponses: (existing?.totalResponses ?? 0) + 1,
      highConfidenceResponses:
        (existing?.highConfidenceResponses ?? 0) +
        (args.confidenceLabel === "high" ? 1 : 0),
      lowConfidenceResponses:
        (existing?.lowConfidenceResponses ?? 0) +
        (args.confidenceLabel === "low" ? 1 : 0),
      citedResponses: (existing?.citedResponses ?? 0) + (args.citationCount > 0 ? 1 : 0),
      hallucinationRiskResponses:
        (existing?.hallucinationRiskResponses ?? 0) + (args.hasHallucinationRisk ? 1 : 0),
      verificationResponses:
        (existing?.verificationResponses ?? 0) + (args.verificationVisible ? 1 : 0),
      verificationPassedResponses:
        (existing?.verificationPassedResponses ?? 0) +
        (args.verificationVisible && args.verificationPassed ? 1 : 0),
      updatedAt: ts,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return await ctx.db.insert("qualityMetricsDaily", {
      dateKey,
      ...patch,
    });
  },
});

export const getAdminDashboard = query({
  args: {
    adminKey: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    ensureAdminAccess(args.adminKey);

    const days = Math.max(1, Math.min(90, args.days ?? 30));
    const rows = await ctx.db
      .query("qualityMetricsDaily")
      .withIndex("by_dateKey")
      .order("desc")
      .take(days);

    const totals = rows.reduce(
      (acc, row) => {
        acc.totalResponses += row.totalResponses;
        acc.highConfidenceResponses += row.highConfidenceResponses;
        acc.lowConfidenceResponses += row.lowConfidenceResponses;
        acc.citedResponses += row.citedResponses;
        acc.hallucinationRiskResponses += row.hallucinationRiskResponses;
        acc.verificationResponses += row.verificationResponses;
        acc.verificationPassedResponses += row.verificationPassedResponses;
        return acc;
      },
      {
        totalResponses: 0,
        highConfidenceResponses: 0,
        lowConfidenceResponses: 0,
        citedResponses: 0,
        hallucinationRiskResponses: 0,
        verificationResponses: 0,
        verificationPassedResponses: 0,
      }
    );

    const total = Math.max(1, totals.totalResponses);
    const verificationBase = Math.max(1, totals.verificationResponses);

    return {
      days,
      totals,
      rates: {
        accuracyRate: Number((totals.highConfidenceResponses / total).toFixed(3)),
        hallucinationRate: Number(
          (totals.hallucinationRiskResponses / total).toFixed(3)
        ),
        citationAccuracy: Number((totals.citedResponses / total).toFixed(3)),
        verificationSuccessRate: Number(
          (totals.verificationPassedResponses / verificationBase).toFixed(3)
        ),
      },
      daily: rows
        .slice()
        .reverse()
        .map((row) => ({
          dateKey: row.dateKey,
          totalResponses: row.totalResponses,
          accuracyRate: Number(
            (row.highConfidenceResponses / Math.max(1, row.totalResponses)).toFixed(3)
          ),
          hallucinationRate: Number(
            (row.hallucinationRiskResponses / Math.max(1, row.totalResponses)).toFixed(3)
          ),
          citationRate: Number(
            (row.citedResponses / Math.max(1, row.totalResponses)).toFixed(3)
          ),
          verificationSuccessRate: Number(
            (
              row.verificationPassedResponses /
              Math.max(1, row.verificationResponses)
            ).toFixed(3)
          ),
        })),
    };
  },
});

export const recordUserFeedback = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    clientIpHash: v.optional(v.string()),
    satisfactionScore: v.number(),
    usefulnessScore: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const dateKey = utcDateKey(now);
    const satisfactionScore = Math.max(1, Math.min(5, Math.round(args.satisfactionScore)));
    const usefulnessScore = Math.max(1, Math.min(5, Math.round(args.usefulnessScore)));
    const note = sanitizeFeedbackNote(args.note);

    let userId: string | undefined;
    if (args.sessionToken?.trim()) {
      userId = await requireSession(args.sessionToken);
      await enforceRateLimit(
        ctx,
        `user:${userId}`,
        MAX_FEEDBACK_PER_USER_PER_HOUR
      );
    } else {
      const ipKey = args.clientIpHash?.trim().slice(0, 64) || "anon:unknown";
      await enforceRateLimit(
        ctx,
        `ip:${ipKey}`,
        MAX_ANON_FEEDBACK_PER_IP_PER_HOUR
      );
    }

    await rejectDuplicateFeedback(
      ctx,
      userId,
      satisfactionScore,
      usefulnessScore,
      note
    );

    return await ctx.db.insert("qualityFeedback", {
      dateKey,
      userId,
      satisfactionScore,
      usefulnessScore,
      note,
      createdAt: now,
    });
  },
});

export const getAdminDashboardV2 = query({
  args: {
    adminKey: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    ensureAdminAccess(args.adminKey);
    const days = Math.max(1, Math.min(90, args.days ?? 30));
    const rows = await ctx.db
      .query("qualityMetricsDaily")
      .withIndex("by_dateKey")
      .order("desc")
      .take(days);
    const totals = rows.reduce(
      (acc, row) => {
        acc.totalResponses += row.totalResponses;
        acc.highConfidenceResponses += row.highConfidenceResponses;
        acc.lowConfidenceResponses += row.lowConfidenceResponses;
        acc.citedResponses += row.citedResponses;
        acc.hallucinationRiskResponses += row.hallucinationRiskResponses;
        acc.verificationResponses += row.verificationResponses;
        acc.verificationPassedResponses += row.verificationPassedResponses;
        return acc;
      },
      {
        totalResponses: 0,
        highConfidenceResponses: 0,
        lowConfidenceResponses: 0,
        citedResponses: 0,
        hallucinationRiskResponses: 0,
        verificationResponses: 0,
        verificationPassedResponses: 0,
      }
    );
    const total = Math.max(1, totals.totalResponses);
    const verificationBase = Math.max(1, totals.verificationResponses);

    const feedbackRows = await ctx.db
      .query("qualityFeedback")
      .withIndex("by_dateKey")
      .order("desc")
      .take(days * 200);

    const feedbackTotals = feedbackRows.reduce(
      (acc, row) => {
        acc.count += 1;
        acc.satisfactionSum += row.satisfactionScore;
        acc.usefulnessSum += row.usefulnessScore;
        return acc;
      },
      { count: 0, satisfactionSum: 0, usefulnessSum: 0 }
    );

    return {
      days,
      totals,
      rates: {
        accuracyRate: Number((totals.highConfidenceResponses / total).toFixed(3)),
        hallucinationRate: Number(
          (totals.hallucinationRiskResponses / total).toFixed(3)
        ),
        citationAccuracy: Number((totals.citedResponses / total).toFixed(3)),
        verificationSuccessRate: Number(
          (totals.verificationPassedResponses / verificationBase).toFixed(3)
        ),
      },
      daily: rows
        .slice()
        .reverse()
        .map((row) => ({
          dateKey: row.dateKey,
          totalResponses: row.totalResponses,
          accuracyRate: Number(
            (row.highConfidenceResponses / Math.max(1, row.totalResponses)).toFixed(3)
          ),
          hallucinationRate: Number(
            (row.hallucinationRiskResponses / Math.max(1, row.totalResponses)).toFixed(3)
          ),
          citationRate: Number(
            (row.citedResponses / Math.max(1, row.totalResponses)).toFixed(3)
          ),
          verificationSuccessRate: Number(
            (
              row.verificationPassedResponses /
              Math.max(1, row.verificationResponses)
            ).toFixed(3)
          ),
        })),
      feedback: {
        count: feedbackTotals.count,
        averageUserSatisfaction:
          feedbackTotals.count > 0
            ? Number((feedbackTotals.satisfactionSum / feedbackTotals.count).toFixed(2))
            : null,
        averageResponseUsefulness:
          feedbackTotals.count > 0
            ? Number((feedbackTotals.usefulnessSum / feedbackTotals.count).toFixed(2))
            : null,
      },
    };
  },
});
