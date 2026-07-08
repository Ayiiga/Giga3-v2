import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const logOrgAuditInternal = internalMutation({
  args: {
    orgId: v.id("organizations"),
    actorId: v.string(),
    action: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    metadataJson: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("orgAuditLogs", {
      orgId: args.orgId,
      actorId: args.actorId,
      action: args.action,
      targetType: args.targetType,
      targetId: args.targetId,
      metadataJson: args.metadataJson,
      createdAt: Date.now(),
    });
  },
});

export async function recordOrgUsage(
  ctx: { db: any },
  orgId: Id<"organizations">,
  delta: {
    aiRequests?: number;
    learningSessions?: number;
    assignmentsSubmitted?: number;
    creditsUsed?: number;
  }
) {
  const dateKey = new Date().toISOString().slice(0, 10);
  const existing = await ctx.db
    .query("orgUsageDaily")
    .withIndex("by_org_date", (q: any) =>
      q.eq("orgId", orgId).eq("dateKey", dateKey)
    )
    .first();

  const now = Date.now();
  if (existing) {
    await ctx.db.patch(existing._id, {
      aiRequests: existing.aiRequests + (delta.aiRequests ?? 0),
      learningSessions:
        existing.learningSessions + (delta.learningSessions ?? 0),
      assignmentsSubmitted:
        existing.assignmentsSubmitted + (delta.assignmentsSubmitted ?? 0),
      creditsUsed: existing.creditsUsed + (delta.creditsUsed ?? 0),
      updatedAt: now,
    });
    return;
  }

  await ctx.db.insert("orgUsageDaily", {
    orgId,
    dateKey,
    aiRequests: delta.aiRequests ?? 0,
    learningSessions: delta.learningSessions ?? 0,
    assignmentsSubmitted: delta.assignmentsSubmitted ?? 0,
    creditsUsed: delta.creditsUsed ?? 0,
    updatedAt: now,
  });
}
