"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import {
  AdminDashboardPanel,
  ParentDashboardPanel,
  StudentDashboardPanel,
  TeacherDashboardPanel,
} from "@/components/enterprise/EnterpriseDashboardPanels";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { useEnterpriseWorkspace } from "@/hooks/useEnterpriseWorkspace";
import { dashboardForRole, ORG_ROLE_LABELS } from "@/lib/enterprise/roles";
import { siteConfig } from "@/lib/site";
import type { Id } from "convex/_generated/dataModel";
import { ArrowLeft, Building2, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function WorkspaceContent() {
  const router = useRouter();
  const params = useSearchParams();
  const orgParam = params.get("org");

  const [orgId, setOrgId] = useState<Id<"organizations"> | null>(
    orgParam as Id<"organizations"> | null
  );
  const [showCreate, setShowCreate] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState<"school" | "enterprise">("school");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ws = useEnterpriseWorkspace(orgId);

  useEffect(() => {
    if (!ws.email) router.replace("/chat/login?next=/workspace");
  }, [ws.email, router]);

  useEffect(() => {
    if (orgParam) setOrgId(orgParam as Id<"organizations">);
  }, [orgParam]);

  useEffect(() => {
    if (!orgId && ws.memberships && ws.memberships.length === 1) {
      setOrgId(ws.memberships[0].org.id as Id<"organizations">);
    }
  }, [orgId, ws.memberships]);

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!ws.sessionToken || !orgName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await ws.createOrg({
        sessionToken: ws.sessionToken,
        name: orgName.trim(),
        type: orgType,
      });
      setOrgId(result.orgId);
      setShowCreate(false);
      setOrgName("");
      router.replace(`/workspace?org=${result.orgId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create workspace");
    } finally {
      setBusy(false);
    }
  }

  if (!ws.email) {
    return <p className="text-center text-muted">Redirecting…</p>;
  }

  if (ws.loading) {
    return <LoadingState label="Loading workspace…" className="py-16" />;
  }

  const panelProps = {
    orgId: orgId!,
    role: ws.role,
    sessionToken: ws.sessionToken!,
    classes: ws.classes,
    assignments: ws.assignments,
    submissions: ws.submissions,
    progress: ws.progress,
    analytics: ws.analytics,
    members: ws.members,
    createClass: ws.createClass,
    enrollStudent: ws.enrollStudent,
    createAssignment: ws.createAssignment,
    publishAssignment: ws.publishAssignment,
    submitAssignment: ws.submitAssignment,
    inviteMember: ws.inviteMember,
  };

  const dashboard = dashboardForRole(ws.role);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={siteConfig.links.dashboard}
            className="mb-3 inline-flex min-h-9 items-center gap-2 text-sm text-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to chat
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600">
              <Building2 className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {ws.selectedOrg?.name ?? "Workspace"}
              </h1>
              <p className="text-sm text-muted">
                {ws.context
                  ? `${ORG_ROLE_LABELS[ws.role]} · ${ws.selectedOrg?.type === "school" ? "School" : "Organization"} workspace`
                  : "Select or create a workspace"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowCreate((v) => !v)}
          >
            <Plus className="mr-1 h-4 w-4" aria-hidden />
            New workspace
          </Button>
          <Link
            href="/enterprise"
            className="inline-flex min-h-9 items-center rounded-lg border border-border px-3 text-sm text-muted hover:text-foreground"
          >
            About enterprise
          </Link>
        </div>
      </header>

      {showCreate && (
        <form
          onSubmit={(e) => void handleCreateOrg(e)}
          className="rounded-2xl border border-border bg-card p-5 space-y-3"
        >
          <h2 className="font-semibold">Create workspace</h2>
          <input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Accra Academy / GIGA Team"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            required
          />
          <select
            value={orgType}
            onChange={(e) => setOrgType(e.target.value as "school" | "enterprise")}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="school">School</option>
            <option value="enterprise">Organization / Business</option>
          </select>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <Button type="submit" size="sm" disabled={busy}>
            Create
          </Button>
        </form>
      )}

      {(ws.memberships?.length ?? 0) > 1 && (
        <div className="flex flex-wrap gap-2">
          {ws.memberships!.map((m) => (
            <button
              key={m.org.id}
              type="button"
              onClick={() => {
                setOrgId(m.org.id as Id<"organizations">);
                router.replace(`/workspace?org=${m.org.id}`);
              }}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                orgId === m.org.id
                  ? "border-sky-500/40 bg-sky-500/10"
                  : "border-border text-muted"
              }`}
            >
              {m.org.name}
            </button>
          ))}
        </div>
      )}

      {!orgId || !ws.context ? (
        <EmptyState
          icon={Building2}
          title="No workspace selected"
          description="Create a school or organization workspace, or pick one from the list above."
        />
      ) : (
        <>
          {dashboard === "admin" && <AdminDashboardPanel {...panelProps} />}
          {dashboard === "teacher" && <TeacherDashboardPanel {...panelProps} />}
          {dashboard === "student" && <StudentDashboardPanel {...panelProps} />}
          {dashboard === "parent" && <ParentDashboardPanel {...panelProps} />}
          {dashboard === "member" && (
            <div className="rounded-2xl border border-border p-6 text-sm text-muted">
              <p>Standard member access — use GigaLearn and chat with your organization context.</p>
              <div className="mt-4 flex gap-3">
                <Link href={siteConfig.links.gigalearn} className="text-accent hover:underline">
                  GigaLearn
                </Link>
                <Link href={siteConfig.links.dashboard} className="text-accent hover:underline">
                  Chat
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function EnterpriseWorkspaceClient() {
  return (
    <ConvexAppShell>
      <Suspense fallback={<LoadingState label="Loading workspace…" className="py-16" />}>
        <WorkspaceContent />
      </Suspense>
    </ConvexAppShell>
  );
}
