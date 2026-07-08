import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireSession } from "./auth";
import {
  isOrgAdminRole,
  isTeachingRole,
  orgRoleHasPermission,
  type OrgPermission,
  type OrgRole,
} from "./orgRoles";

type DbCtx = QueryCtx | MutationCtx;

export class OrgAccessError extends Error {
  constructor(message = "Organization access denied") {
    super(message);
    this.name = "OrgAccessError";
  }
}

export async function getActiveOrgMember(
  ctx: DbCtx,
  orgId: Id<"organizations">,
  userId: string
) {
  const member = await ctx.db
    .query("orgMembers")
    .withIndex("by_org_user", (q) => q.eq("orgId", orgId).eq("userId", userId))
    .first();
  if (!member || member.status !== "active") return null;
  return member;
}

export async function requireOrgMember(
  ctx: DbCtx,
  sessionToken: string | undefined,
  orgId: Id<"organizations">
) {
  const userId = await requireSession(sessionToken);
  const member = await getActiveOrgMember(ctx, orgId, userId);
  if (!member) throw new OrgAccessError();
  return { userId, member };
}

export async function requireOrgPermission(
  ctx: DbCtx,
  sessionToken: string | undefined,
  orgId: Id<"organizations">,
  permission: OrgPermission
) {
  const { userId, member } = await requireOrgMember(ctx, sessionToken, orgId);
  if (!orgRoleHasPermission(member.role as OrgRole, permission)) {
    throw new OrgAccessError(`Missing permission: ${permission}`);
  }
  return { userId, member };
}

export async function requireOrgAdmin(
  ctx: DbCtx,
  sessionToken: string | undefined,
  orgId: Id<"organizations">
) {
  const { userId, member } = await requireOrgMember(ctx, sessionToken, orgId);
  if (!isOrgAdminRole(member.role as OrgRole)) {
    throw new OrgAccessError("Administrator access required");
  }
  return { userId, member };
}

export async function requireTeachingAccess(
  ctx: DbCtx,
  sessionToken: string | undefined,
  orgId: Id<"organizations">
) {
  const { userId, member } = await requireOrgMember(ctx, sessionToken, orgId);
  if (!isTeachingRole(member.role as OrgRole)) {
    throw new OrgAccessError("Teacher access required");
  }
  return { userId, member };
}

export function normalizeOrgSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
