import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import {
  getActiveOrgMember,
  normalizeOrgSlug,
  requireOrgAdmin,
  requireOrgMember,
  requireOrgPermission,
} from "./orgAuth";
import { ORG_ROLE_LABELS, type OrgRole } from "./orgRoles";
import { orgRoleValidator, orgTypeValidator } from "./schema";
import { sessionArgs } from "./validators";

function toPublicOrg(org: {
  _id: import("./_generated/dataModel").Id<"organizations">;
  slug: string;
  name: string;
  type: "school" | "enterprise";
  description?: string;
  creditPool: number;
  status: "active" | "suspended";
  createdAt: number;
}) {
  return {
    id: org._id,
    slug: org.slug,
    name: org.name,
    type: org.type,
    description: org.description ?? "",
    creditPool: org.creditPool,
    status: org.status,
    createdAt: org.createdAt,
  };
}

export const listMyOrganizations = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const active = memberships.filter((m) => m.status === "active");
    const results = [];
    for (const membership of active) {
      const org = await ctx.db.get(membership.orgId);
      if (!org || org.status !== "active") continue;
      results.push({
        org: toPublicOrg(org),
        role: membership.role,
        roleLabel: ORG_ROLE_LABELS[membership.role as OrgRole],
        joinedAt: membership.joinedAt,
      });
    }
    return results.sort((a, b) => b.joinedAt - a.joinedAt);
  },
});

export const getOrganization = query({
  args: {
    ...sessionArgs,
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { member } = await requireOrgMember(
      ctx,
      args.sessionToken,
      args.orgId
    );
    const org = await ctx.db.get(args.orgId);
    if (!org) return null;

    const members = await ctx.db
      .query("orgMembers")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const activeMembers = members.filter((m) => m.status === "active");

    return {
      org: toPublicOrg(org),
      myRole: member.role,
      myRoleLabel: ORG_ROLE_LABELS[member.role as OrgRole],
      memberCount: activeMembers.length,
      canManage: member.role === "org_admin" || member.role === "school_admin",
    };
  },
});

export const createOrganization = mutation({
  args: {
    ...sessionArgs,
    name: v.string(),
    type: orgTypeValidator,
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const name = args.name.trim().slice(0, 120);
    if (!name) throw new Error("Organization name is required");

    const baseSlug = normalizeOrgSlug(args.slug?.trim() || name);
    if (!baseSlug) throw new Error("Invalid organization slug");

    let slug = baseSlug;
    let suffix = 0;
    while (true) {
      const existing = await ctx.db
        .query("organizations")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (!existing) break;
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
      if (suffix > 20) throw new Error("Could not allocate unique slug");
    }

    const now = Date.now();
    const adminRole: OrgRole =
      args.type === "school" ? "school_admin" : "org_admin";

    const orgId = await ctx.db.insert("organizations", {
      slug,
      name,
      type: args.type,
      description: args.description?.trim().slice(0, 500),
      settingsJson: "{}",
      creditPool: 0,
      status: "active",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("orgMembers", {
      orgId,
      userId,
      role: adminRole,
      status: "active",
      joinedAt: now,
      updatedAt: now,
    });

    await ctx.runMutation(internal.enterpriseAudit.logOrgAuditInternal, {
      orgId,
      actorId: userId,
      action: "org.created",
      targetType: "organization",
      targetId: orgId,
      metadataJson: JSON.stringify({ type: args.type, slug }),
    });

    return { orgId, slug };
  },
});

export const inviteMember = mutation({
  args: {
    ...sessionArgs,
    orgId: v.id("organizations"),
    email: v.string(),
    role: orgRoleValidator,
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireOrgPermission(
      ctx,
      args.sessionToken,
      args.orgId,
      "org.manage_members"
    );

    const email = args.email.trim().toLowerCase();
    if (!email.includes("@")) throw new Error("Valid email required");
    if (args.role === "org_admin" || args.role === "school_admin") {
      const { member } = await requireOrgAdmin(ctx, args.sessionToken, args.orgId);
      if (member.role !== "org_admin" && member.role !== "school_admin") {
        throw new Error("Only administrators can assign admin roles");
      }
    }

    const existing = await ctx.db
      .query("orgMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", args.orgId).eq("userId", email)
      )
      .first();

    const now = Date.now();
    if (existing) {
      if (existing.status === "active") {
        throw new Error("Member already active in this workspace");
      }
      await ctx.db.patch(existing._id, {
        role: args.role,
        status: "active",
        displayName: args.displayName?.trim().slice(0, 80),
        invitedBy: userId,
        joinedAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("orgMembers", {
        orgId: args.orgId,
        userId: email,
        role: args.role,
        status: "active",
        displayName: args.displayName?.trim().slice(0, 80),
        invitedBy: userId,
        joinedAt: now,
        updatedAt: now,
      });
    }

    await ctx.runMutation(internal.enterpriseAudit.logOrgAuditInternal, {
      orgId: args.orgId,
      actorId: userId,
      action: "member.invited",
      targetType: "member",
      targetId: email,
      metadataJson: JSON.stringify({ role: args.role }),
    });

    return { email, role: args.role };
  },
});

export const updateMemberRole = mutation({
  args: {
    ...sessionArgs,
    orgId: v.id("organizations"),
    memberEmail: v.string(),
    role: orgRoleValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireOrgAdmin(
      ctx,
      args.sessionToken,
      args.orgId
    );
    const email = args.memberEmail.trim().toLowerCase();
    if (email === userId) throw new Error("Cannot change your own role");

    const member = await ctx.db
      .query("orgMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", args.orgId).eq("userId", email)
      )
      .first();
    if (!member || member.status !== "active") {
      throw new Error("Member not found");
    }

    await ctx.db.patch(member._id, {
      role: args.role,
      updatedAt: Date.now(),
    });

    await ctx.runMutation(internal.enterpriseAudit.logOrgAuditInternal, {
      orgId: args.orgId,
      actorId: userId,
      action: "member.role_updated",
      targetType: "member",
      targetId: email,
      metadataJson: JSON.stringify({ role: args.role }),
    });

    return { email, role: args.role };
  },
});

export const removeMember = mutation({
  args: {
    ...sessionArgs,
    orgId: v.id("organizations"),
    memberEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireOrgAdmin(
      ctx,
      args.sessionToken,
      args.orgId
    );
    const email = args.memberEmail.trim().toLowerCase();
    if (email === userId) throw new Error("Cannot remove yourself");

    const member = await ctx.db
      .query("orgMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", args.orgId).eq("userId", email)
      )
      .first();
    if (!member) throw new Error("Member not found");

    await ctx.db.patch(member._id, {
      status: "removed",
      updatedAt: Date.now(),
    });

    await ctx.runMutation(internal.enterpriseAudit.logOrgAuditInternal, {
      orgId: args.orgId,
      actorId: userId,
      action: "member.removed",
      targetType: "member",
      targetId: email,
    });

    return { removed: true as const };
  },
});

export const listOrgMembers = query({
  args: {
    ...sessionArgs,
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireOrgPermission(
      ctx,
      args.sessionToken,
      args.orgId,
      "org.manage_members"
    );

    const members = await ctx.db
      .query("orgMembers")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    return members
      .filter((m) => m.status === "active")
      .map((m) => ({
        email: m.userId,
        role: m.role,
        roleLabel: ORG_ROLE_LABELS[m.role as OrgRole],
        displayName: m.displayName ?? m.userId.split("@")[0],
        joinedAt: m.joinedAt,
      }))
      .sort((a, b) => a.role.localeCompare(b.role));
  },
});

export const getMyOrgContext = query({
  args: {
    ...sessionArgs,
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { userId, member } = await requireOrgMember(
      ctx,
      args.sessionToken,
      args.orgId
    );
    const org = await ctx.db.get(args.orgId);
    if (!org) return null;

    return {
      org: toPublicOrg(org),
      userId,
      role: member.role,
      roleLabel: ORG_ROLE_LABELS[member.role as OrgRole],
      permissions: {
        canManageOrg:
          member.role === "org_admin" || member.role === "school_admin",
        canTeach:
          member.role === "teacher" ||
          member.role === "org_admin" ||
          member.role === "school_admin",
        canViewChildren: member.role === "parent",
        isStudent: member.role === "student",
      },
    };
  },
});
