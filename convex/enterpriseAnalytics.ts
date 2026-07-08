import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgPermission } from "./orgAuth";
import { sessionArgs } from "./validators";

export const getOrgDashboard = query({
  args: {
    ...sessionArgs,
    orgId: v.id("organizations"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireOrgPermission(
      ctx,
      args.sessionToken,
      args.orgId,
      "org.view_analytics"
    );

    const dayCap = Math.min(Math.max(args.days ?? 14, 7), 90);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - dayCap);
    const cutoffKey = cutoff.toISOString().slice(0, 10);

    const usageRows = await ctx.db
      .query("orgUsageDaily")
      .withIndex("by_org_date", (q) => q.eq("orgId", args.orgId))
      .collect();

    const recent = usageRows
      .filter((r) => r.dateKey >= cutoffKey)
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

    const totals = recent.reduce(
      (acc, row) => ({
        aiRequests: acc.aiRequests + row.aiRequests,
        learningSessions: acc.learningSessions + row.learningSessions,
        assignmentsSubmitted: acc.assignmentsSubmitted + row.assignmentsSubmitted,
        creditsUsed: acc.creditsUsed + row.creditsUsed,
      }),
      {
        aiRequests: 0,
        learningSessions: 0,
        assignmentsSubmitted: 0,
        creditsUsed: 0,
      }
    );

    const members = await ctx.db
      .query("orgMembers")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    const activeMembers = members.filter((m) => m.status === "active");

    const classes = await ctx.db
      .query("orgClasses")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    const activeClasses = classes.filter((c) => c.status === "active");

    const assignments = await ctx.db
      .query("orgAssignments")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const roleBreakdown: Record<string, number> = {};
    for (const m of activeMembers) {
      roleBreakdown[m.role] = (roleBreakdown[m.role] ?? 0) + 1;
    }

    return {
      aggregated: true,
      periodDays: dayCap,
      totals,
      daily: recent.map((r) => ({
        dateKey: r.dateKey,
        aiRequests: r.aiRequests,
        learningSessions: r.learningSessions,
        assignmentsSubmitted: r.assignmentsSubmitted,
        creditsUsed: r.creditsUsed,
      })),
      members: {
        total: activeMembers.length,
        byRole: roleBreakdown,
      },
      classrooms: {
        total: activeClasses.length,
      },
      assignments: {
        total: assignments.length,
        published: assignments.filter((a) => a.status === "published").length,
        draft: assignments.filter((a) => a.status === "draft").length,
      },
      attendanceReady: false,
    };
  },
});

export const listOrgAuditLogs = query({
  args: {
    ...sessionArgs,
    orgId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireOrgPermission(
      ctx,
      args.sessionToken,
      args.orgId,
      "org.manage"
    );

    const cap = Math.min(Math.max(args.limit ?? 40, 1), 100);
    const rows = await ctx.db
      .query("orgAuditLogs")
      .withIndex("by_org_created", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(cap);

    return rows.map((r) => ({
      id: r._id,
      actorId: r.actorId,
      action: r.action,
      targetType: r.targetType ?? null,
      targetId: r.targetId ?? null,
      createdAt: r.createdAt,
    }));
  },
});
