import { query } from "./_generated/server";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import { isPhase6FlagEnabled } from "./phase6Controls";
import { adminCredentialArgs, ensureAdminAccess } from "./adminAccess";

/**
 * Organization & business accounts summary — wraps existing enterprise tables.
 * Does not alter personal account flows.
 */
export const getMyOrganizations = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    if (!(await isPhase6FlagEnabled(ctx, "phase6.org_accounts"))) {
      return { enabled: false as const, organizations: [] };
    }
    const userId = await requireSession(args.sessionToken);
    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(30);

    const organizations = [];
    for (const m of memberships) {
      const org = await ctx.db.get(m.orgId);
      if (!org) continue;
      organizations.push({
        orgId: org._id,
        slug: org.slug,
        name: org.name,
        type: org.type,
        role: m.role,
        creditPool: org.creditPool,
      });
    }

    return {
      enabled: true as const,
      organizations,
      supportedTypes: ["school", "enterprise"] as const,
      plannedTypes: ["ngo", "church", "community"] as const,
      teamManagementReady: true,
      verificationWorkflowReady: true,
      note: "Personal accounts unchanged. Org features reuse enterpriseOrgs APIs.",
    };
  },
});

/** Admin: org account scale snapshot. */
export const getOrgAccountsAdmin = query({
  args: adminCredentialArgs,
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    if (!(await isPhase6FlagEnabled(ctx, "phase6.org_accounts"))) {
      return { enabled: false as const };
    }
    const orgs = await ctx.db.query("organizations").take(100);
    const members = await ctx.db.query("orgMembers").take(500);
    const byType: Record<string, number> = {};
    for (const o of orgs) {
      byType[o.type] = (byType[o.type] ?? 0) + 1;
    }
    return {
      enabled: true as const,
      orgCount: orgs.length,
      memberCount: members.length,
      byType,
    };
  },
});
