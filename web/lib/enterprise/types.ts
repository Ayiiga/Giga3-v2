import type { OrgRole } from "./roles";

export type PublicOrganization = {
  id: string;
  slug: string;
  name: string;
  type: "school" | "enterprise";
  description: string;
  creditPool: number;
  status: "active" | "suspended";
  createdAt: number;
};

export type OrgMembership = {
  org: PublicOrganization;
  role: OrgRole;
  roleLabel: string;
  joinedAt: number;
};

export type OrgClass = {
  id: string;
  name: string;
  subject: string;
  gradeLevel: string;
  teacherId: string;
  description: string;
  academicYear: string;
  createdAt: number;
};

export type OrgAssignment = {
  id: string;
  classId: string;
  title: string;
  description: string;
  dueAt: number | null;
  status: "draft" | "published" | "closed";
  teacherId: string;
  createdAt: number;
};

export type OrgSubmission = {
  id: string;
  assignmentId: string;
  studentId: string;
  content: string;
  status: "pending" | "submitted" | "graded" | "late";
  score: number | null;
  feedback: string;
  submittedAt: number | null;
  updatedAt: number;
};

export type StudentProgress = {
  studentId: string;
  totalAssignments: number;
  submitted: number;
  graded: number;
  averageScore: number | null;
  completionRate: number;
};

export type OrgAnalytics = {
  aggregated: boolean;
  periodDays: number;
  totals: {
    aiRequests: number;
    learningSessions: number;
    assignmentsSubmitted: number;
    creditsUsed: number;
  };
  members: { total: number; byRole: Record<string, number> };
  classrooms: { total: number };
  assignments: { total: number; published: number; draft: number };
  attendanceReady: boolean;
};
