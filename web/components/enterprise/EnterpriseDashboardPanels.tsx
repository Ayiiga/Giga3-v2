"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { Button, ButtonLink } from "@/components/ui/Button";
import { formatTimestampDateTime } from "@/lib/datetime";
import {
  ORG_ROLE_LABELS,
  type OrgRole,
} from "@/lib/enterprise/roles";
import type {
  OrgAnalytics,
  OrgAssignment,
  OrgClass,
  OrgSubmission,
  StudentProgress,
} from "@/lib/enterprise/types";
import { siteConfig } from "@/lib/site";
import type { Id } from "convex/_generated/dataModel";
import {
  BarChart3,
  GraduationCap,
  Plus,
  Users,
} from "lucide-react";
import { useState } from "react";

type WorkspacePanelsProps = {
  orgId: Id<"organizations">;
  role: OrgRole;
  sessionToken: string;
  classes: OrgClass[] | undefined;
  assignments: OrgAssignment[] | undefined;
  submissions: OrgSubmission[] | undefined;
  progress: StudentProgress | undefined;
  analytics: OrgAnalytics | undefined;
  members: Array<{
    email: string;
    role: string;
    roleLabel: string;
    displayName: string;
    joinedAt: number;
  }> | undefined;
  createClass: (args: {
    sessionToken: string;
    orgId: Id<"organizations">;
    name: string;
    subject?: string;
    gradeLevel?: string;
  }) => Promise<{ classId: Id<"orgClasses"> }>;
  enrollStudent: (args: {
    sessionToken: string;
    orgId: Id<"organizations">;
    classId: Id<"orgClasses">;
    studentEmail: string;
    parentEmail?: string;
  }) => Promise<unknown>;
  createAssignment: (args: {
    sessionToken: string;
    orgId: Id<"organizations">;
    classId: Id<"orgClasses">;
    title: string;
    description: string;
    publish?: boolean;
  }) => Promise<unknown>;
  publishAssignment: (args: {
    sessionToken: string;
    orgId: Id<"organizations">;
    assignmentId: Id<"orgAssignments">;
  }) => Promise<unknown>;
  submitAssignment: (args: {
    sessionToken: string;
    orgId: Id<"organizations">;
    assignmentId: Id<"orgAssignments">;
    content: string;
  }) => Promise<unknown>;
  inviteMember: (args: {
    sessionToken: string;
    orgId: Id<"organizations">;
    email: string;
    role: OrgRole;
  }) => Promise<unknown>;
};

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function AdminDashboardPanel({
  orgId,
  role,
  sessionToken,
  analytics,
  members,
  classes,
  assignments,
  inviteMember,
  createClass,
}: WorkspacePanelsProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("teacher");
  const [className, setClassName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      await inviteMember({
        sessionToken,
        orgId,
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail("");
      setMessage("Member added to workspace.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    if (!className.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      await createClass({
        sessionToken,
        orgId,
        name: className.trim(),
      });
      setClassName("");
      setMessage("Class created.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not create class");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Members" value={analytics?.members.total ?? "—"} />
        <StatCard label="Classrooms" value={analytics?.classrooms.total ?? classes?.length ?? "—"} />
        <StatCard
          label="Assignments"
          value={analytics?.assignments.published ?? assignments?.filter((a) => a.status === "published").length ?? "—"}
        />
        <StatCard
          label="AI sessions (period)"
          value={analytics?.totals.learningSessions ?? "—"}
        />
      </div>

      {message && (
        <p className="rounded-xl border border-border bg-card px-4 py-2 text-sm">{message}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border p-5">
          <h3 className="flex items-center gap-2 font-semibold">
            <Users className="h-4 w-4" aria-hidden />
            Team members
          </h3>
          <form onSubmit={(e) => void handleInvite(e)} className="mt-4 space-y-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@school.edu"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as OrgRole)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              {(["teacher", "student", "parent", "creator", "standard_user"] as const).map(
                (r) => (
                  <option key={r} value={r}>
                    {ORG_ROLE_LABELS[r]}
                  </option>
                )
              )}
            </select>
            <Button type="submit" size="sm" disabled={busy}>
              Invite member
            </Button>
          </form>
          <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto text-sm">
            {(members ?? []).map((m) => (
              <li
                key={m.email}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <span>{m.displayName}</span>
                <span className="text-xs text-muted">{m.roleLabel}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border p-5">
          <h3 className="flex items-center gap-2 font-semibold">
            <GraduationCap className="h-4 w-4" aria-hidden />
            Create classroom
          </h3>
          <form onSubmit={(e) => void handleCreateClass(e)} className="mt-4 flex gap-2">
            <input
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="JHS 2 Mathematics"
              className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2 text-sm"
            />
            <Button type="submit" size="sm" disabled={busy}>
              <Plus className="h-4 w-4" aria-hidden />
            </Button>
          </form>
          <ul className="mt-4 space-y-2 text-sm">
            {(classes ?? []).slice(0, 6).map((c) => (
              <li key={c.id} className="rounded-lg border border-border px-3 py-2">
                {c.name}
                {c.subject ? ` · ${c.subject}` : ""}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {analytics && (
        <section className="rounded-2xl border border-border p-5">
          <h3 className="flex items-center gap-2 font-semibold">
            <BarChart3 className="h-4 w-4" aria-hidden />
            Usage analytics (aggregated)
          </h3>
          <dl className="mt-4 grid gap-3 sm:grid-cols-4 text-sm">
            <div>
              <dt className="text-muted">AI requests</dt>
              <dd className="font-semibold">{analytics.totals.aiRequests}</dd>
            </div>
            <div>
              <dt className="text-muted">Learning sessions</dt>
              <dd className="font-semibold">{analytics.totals.learningSessions}</dd>
            </div>
            <div>
              <dt className="text-muted">Submissions</dt>
              <dd className="font-semibold">{analytics.totals.assignmentsSubmitted}</dd>
            </div>
            <div>
              <dt className="text-muted">Credits used</dt>
              <dd className="font-semibold">{analytics.totals.creditsUsed}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted">
            Attendance tracking architecture is future-ready — not enabled in this release.
          </p>
        </section>
      )}
    </div>
  );
}

export function TeacherDashboardPanel({
  orgId,
  sessionToken,
  classes,
  assignments,
  submissions,
  createAssignment,
  publishAssignment,
  enrollStudent,
}: WorkspacePanelsProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classId, setClassId] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !classId) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = (await createAssignment({
        sessionToken,
        orgId,
        classId: classId as Id<"orgClasses">,
        title: title.trim(),
        description: description.trim() || title.trim(),
        publish: true,
      })) as { assignmentId: Id<"orgAssignments"> };
      setTitle("");
      setDescription("");
      setMessage("Assignment published to class.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!studentEmail.trim() || !classId) return;
    setBusy(true);
    try {
      await enrollStudent({
        sessionToken,
        orgId,
        classId: classId as Id<"orgClasses">,
        studentEmail: studentEmail.trim(),
      });
      setStudentEmail("");
      setMessage("Student enrolled.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Enroll failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        <ButtonLink href={`${siteConfig.links.gigalearn}?tab=teacher`} variant="secondary" size="sm">
          AI teaching tools
        </ButtonLink>
        <ButtonLink href={siteConfig.links.dashboard} variant="ghost" size="sm">
          AI teaching assistant (chat)
        </ButtonLink>
      </div>

      {message && (
        <p className="rounded-xl border border-border bg-card px-4 py-2 text-sm">{message}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border p-5">
          <h3 className="font-semibold">Create assignment</h3>
          <form onSubmit={(e) => void handleAssignment(e)} className="mt-4 space-y-3">
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              required
            >
              <option value="">Select class</option>
              {(classes ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Assignment title"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              required
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Instructions for students"
              rows={3}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <Button type="submit" size="sm" disabled={busy}>
              Publish assignment
            </Button>
          </form>
        </section>

        <section className="rounded-2xl border border-border p-5">
          <h3 className="font-semibold">Enroll student</h3>
          <form onSubmit={(e) => void handleEnroll(e)} className="mt-4 space-y-3">
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              required
            >
              <option value="">Select class</option>
              {(classes ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="email"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              placeholder="student@school.edu"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              required
            />
            <Button type="submit" size="sm" disabled={busy}>
              Enroll
            </Button>
          </form>
        </section>
      </div>

      <section>
        <h3 className="font-semibold">Assignments & submissions</h3>
        <div className="mt-3 space-y-3">
          {(assignments ?? []).slice(0, 8).map((a) => {
            const subs = (submissions ?? []).filter((s) => s.assignmentId === a.id);
            return (
              <article key={a.id} className="rounded-xl border border-border p-4 text-sm">
                <p className="font-medium">{a.title}</p>
                <p className="mt-1 text-muted">{a.description.slice(0, 120)}</p>
                <p className="mt-2 text-xs text-muted">
                  {a.status} · {subs.length} submission(s)
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function StudentDashboardPanel({
  orgId,
  sessionToken,
  assignments,
  submissions,
  progress,
  submitAssignment,
}: WorkspacePanelsProps) {
  const [activeAssignment, setActiveAssignment] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeAssignment || !content.trim()) return;
    setBusy(true);
    try {
      await submitAssignment({
        sessionToken,
        orgId,
        assignmentId: activeAssignment as Id<"orgAssignments">,
        content: content.trim(),
      });
      setContent("");
      setMessage("Assignment submitted.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Completion" value={`${progress?.completionRate ?? 0}%`} />
        <StatCard label="Submitted" value={progress?.submitted ?? 0} />
        <StatCard
          label="Average score"
          value={progress?.averageScore != null ? `${progress.averageScore}%` : "—"}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href={`${siteConfig.links.gigalearn}?tab=student`} variant="secondary" size="sm">
          AI Tutor (GigaLearn)
        </ButtonLink>
        <ButtonLink href={siteConfig.links.gigasocial} variant="ghost" size="sm">
          Achievements (GigaSocial XP)
        </ButtonLink>
      </div>

      {message && (
        <p className="rounded-xl border border-border bg-card px-4 py-2 text-sm">{message}</p>
      )}

      <section className="rounded-2xl border border-border p-5">
        <h3 className="font-semibold">Submit assignment</h3>
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-3">
          <select
            value={activeAssignment}
            onChange={(e) => setActiveAssignment(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            required
          >
            <option value="">Select assignment</option>
            {(assignments ?? [])
              .filter((a) => a.status === "published")
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
          </select>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Your answer or submission"
            rows={4}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            required
          />
          <Button type="submit" size="sm" disabled={busy}>
            Submit
          </Button>
        </form>
      </section>

      <section>
        <h3 className="font-semibold">My submissions</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {(submissions ?? []).map((s) => (
            <li key={s.id} className="rounded-lg border border-border px-3 py-2">
              <span className="capitalize">{s.status}</span>
              {s.score != null ? ` · Score ${s.score}%` : ""}
              {s.submittedAt
                ? ` · ${formatTimestampDateTime(s.submittedAt)}`
                : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function ParentDashboardPanel({ progress, assignments, submissions }: WorkspacePanelsProps) {
  return (
    <div className="space-y-8">
      <p className="rounded-xl border border-amber-500/30 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Read-only parent view — you cannot modify academic records.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Completion" value={`${progress?.completionRate ?? 0}%`} />
        <StatCard label="Assignments done" value={progress?.submitted ?? 0} />
        <StatCard
          label="Average score"
          value={progress?.averageScore != null ? `${progress.averageScore}%` : "—"}
        />
      </div>

      <section>
        <h3 className="font-semibold">Published assignments</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {(assignments ?? [])
            .filter((a) => a.status === "published")
            .map((a) => (
              <li key={a.id} className="rounded-lg border border-border px-3 py-2">
                {a.title}
                {a.dueAt ? ` · Due ${formatTimestampDateTime(a.dueAt)}` : ""}
              </li>
            ))}
        </ul>
      </section>

      <section>
        <h3 className="font-semibold">Child submissions</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {(submissions ?? []).map((s) => (
            <li key={s.id} className="rounded-lg border border-border px-3 py-2">
              <span className="capitalize">{s.status}</span>
              {s.score != null ? ` · ${s.score}%` : ""}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-muted">
        Attendance summary is future-ready. Learning recommendations: explore GigaLearn parent tools.
      </p>
      <ButtonLink href={`${siteConfig.links.gigalearn}?tab=parent`} variant="secondary" size="sm">
        Parent learning tips
      </ButtonLink>
    </div>
  );
}
