"use client";

import { getSessionToken, getUserEmail } from "@/lib/auth";
import type {
  OrgAnalytics,
  OrgAssignment,
  OrgClass,
  OrgMembership,
  OrgSubmission,
  PublicOrganization,
  StudentProgress,
} from "@/lib/enterprise/types";
import type { OrgRole } from "@/lib/enterprise/roles";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";

export function useEnterpriseWorkspace(orgId: Id<"organizations"> | null) {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSessionToken(getSessionToken());
  }, []);

  const email = getUserEmail();

  const memberships = useQuery(
    api.enterpriseOrgs.listMyOrganizations,
    mounted && sessionToken ? { sessionToken } : "skip"
  ) as OrgMembership[] | undefined;

  const context = useQuery(
    api.enterpriseOrgs.getMyOrgContext,
    mounted && sessionToken && orgId ? { sessionToken, orgId } : "skip"
  );

  const classes = useQuery(
    api.enterpriseClassrooms.listClasses,
    mounted && sessionToken && orgId ? { sessionToken, orgId } : "skip"
  ) as OrgClass[] | undefined;

  const assignments = useQuery(
    api.enterpriseAssignments.listAssignments,
    mounted && sessionToken && orgId ? { sessionToken, orgId } : "skip"
  ) as OrgAssignment[] | undefined;

  const submissions = useQuery(
    api.enterpriseAssignments.listSubmissions,
    mounted && sessionToken && orgId ? { sessionToken, orgId } : "skip"
  ) as OrgSubmission[] | undefined;

  const progress = useQuery(
    api.enterpriseAssignments.getStudentProgress,
    mounted && sessionToken && orgId ? { sessionToken, orgId } : "skip"
  ) as StudentProgress | undefined;

  const analytics = useQuery(
    api.enterpriseAnalytics.getOrgDashboard,
    mounted && sessionToken && orgId ? { sessionToken, orgId } : "skip"
  ) as OrgAnalytics | undefined;

  const members = useQuery(
    api.enterpriseOrgs.listOrgMembers,
    mounted && sessionToken && orgId && context?.permissions.canManageOrg
      ? { sessionToken, orgId }
      : "skip"
  );

  const createOrg = useMutation(api.enterpriseOrgs.createOrganization);
  const inviteMember = useMutation(api.enterpriseOrgs.inviteMember);
  const createClass = useMutation(api.enterpriseClassrooms.createClass);
  const enrollStudent = useMutation(api.enterpriseClassrooms.enrollStudent);
  const createAssignment = useMutation(api.enterpriseAssignments.createAssignment);
  const publishAssignment = useMutation(api.enterpriseAssignments.publishAssignment);
  const submitAssignment = useMutation(api.enterpriseAssignments.submitAssignment);
  const gradeSubmission = useMutation(api.enterpriseAssignments.gradeSubmission);

  const loading =
    !mounted ||
    !sessionToken ||
    memberships === undefined ||
    (orgId && context === undefined);

  const role = (context?.role ?? "standard_user") as OrgRole;

  const selectedOrg: PublicOrganization | null = useMemo(() => {
    if (!orgId || !memberships) return null;
    const match = memberships.find((m) => m.org.id === orgId);
    return match?.org ?? null;
  }, [orgId, memberships]);

  return {
    email,
    sessionToken,
    mounted,
    memberships,
    orgId,
    selectedOrg,
    context,
    role,
    classes,
    assignments,
    submissions,
    progress,
    analytics,
    members,
    loading,
    createOrg,
    inviteMember,
    createClass,
    enrollStudent,
    createAssignment,
    publishAssignment,
    submitAssignment,
    gradeSubmission,
  };
}
