/** Organization role definitions and permission matrix. */

export const ORG_ROLES = [
  "org_admin",
  "school_admin",
  "teacher",
  "parent",
  "student",
  "creator",
  "standard_user",
] as const;

export type OrgRole = (typeof ORG_ROLES)[number];

export type OrgPermission =
  | "org.manage"
  | "org.view_analytics"
  | "org.manage_members"
  | "org.manage_credits"
  | "class.create"
  | "class.manage"
  | "class.view"
  | "assignment.create"
  | "assignment.publish"
  | "assignment.submit"
  | "assignment.grade"
  | "assignment.view_own"
  | "assignment.view_children"
  | "student.enroll"
  | "resources.manage"
  | "ai.use";

const ROLE_PERMISSIONS: Record<OrgRole, ReadonlySet<OrgPermission>> = {
  org_admin: new Set([
    "org.manage",
    "org.view_analytics",
    "org.manage_members",
    "org.manage_credits",
    "class.create",
    "class.manage",
    "class.view",
    "assignment.create",
    "assignment.publish",
    "assignment.grade",
    "student.enroll",
    "resources.manage",
    "ai.use",
  ]),
  school_admin: new Set([
    "org.manage",
    "org.view_analytics",
    "org.manage_members",
    "org.manage_credits",
    "class.create",
    "class.manage",
    "class.view",
    "assignment.create",
    "assignment.publish",
    "assignment.grade",
    "student.enroll",
    "resources.manage",
    "ai.use",
  ]),
  teacher: new Set([
    "org.view_analytics",
    "class.create",
    "class.manage",
    "class.view",
    "assignment.create",
    "assignment.publish",
    "assignment.grade",
    "student.enroll",
    "resources.manage",
    "ai.use",
  ]),
  parent: new Set([
    "class.view",
    "assignment.view_children",
    "ai.use",
  ]),
  student: new Set([
    "class.view",
    "assignment.submit",
    "assignment.view_own",
    "ai.use",
  ]),
  creator: new Set([
    "class.view",
    "resources.manage",
    "ai.use",
  ]),
  standard_user: new Set(["class.view", "ai.use"]),
};

export function orgRoleHasPermission(
  role: OrgRole,
  permission: OrgPermission
): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

export function isOrgAdminRole(role: OrgRole): boolean {
  return role === "org_admin" || role === "school_admin";
}

export function isTeachingRole(role: OrgRole): boolean {
  return role === "teacher" || isOrgAdminRole(role);
}

export const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  org_admin: "Organization Administrator",
  school_admin: "School Administrator",
  teacher: "Teacher",
  parent: "Parent",
  student: "Student",
  creator: "Creator",
  standard_user: "Standard User",
};

/** Platform super-admin is separate from org roles (adminAccess.ts). */
export const PLATFORM_SUPER_ADMIN_LABEL = "Super Administrator";
