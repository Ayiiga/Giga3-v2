"use client";

import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { Activity } from "lucide-react";

type AdminCreds = { adminSessionToken: string };

/** Phase 6 ops / commerce / org / compliance admin snapshots. */
export function AdminPhase6OpsPanel({ adminCreds }: { adminCreds: AdminCreds }) {
  const ops = useQuery(api.phase6Operations.getOperationsDashboard, adminCreds);
  const commerce = useQuery(api.phase6Commerce.getCommerceAdmin, adminCreds);
  const orgs = useQuery(api.phase6OrgAccounts.getOrgAccountsAdmin, adminCreds);
  const compliance = useQuery(api.phase6Compliance.getComplianceAdmin, adminCreds);
  const partners = useQuery(
    api.phase6Partnerships.listPartnershipInterestsAdmin,
    adminCreds
  );

  const anyEnabled =
    ops?.enabled ||
    commerce?.enabled ||
    orgs?.enabled ||
    compliance?.enabled ||
    partners?.enabled;

  if (
    ops === undefined ||
    commerce === undefined ||
    orgs === undefined ||
    compliance === undefined ||
    partners === undefined
  ) {
    return <p className="text-sm text-muted">Loading Phase 6 ops…</p>;
  }

  if (!anyEnabled) {
    return (
      <p className="text-sm text-muted">
        Enable Phase 6 operations / commerce / org / compliance / partnerships flags
        to view scale dashboards.
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-700">
          <Activity className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Phase 6 scale operations</h2>
          <p className="mt-1 text-sm text-muted">
            Monitoring, commerce health, org counts, and partnership queue.
          </p>
        </div>
      </div>

      {ops?.enabled && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Health samples" value={ops.health.samples.length} />
          <Stat label="Degraded signals" value={ops.health.degradedCount} />
          <Stat label="Security events" value={ops.security.recentEvents} />
        </div>
      )}

      {commerce?.enabled && (
        <p className="text-sm text-muted">
          Payment success rate (sample {commerce.sampleSize}):{" "}
          <strong>{commerce.successRatePct}%</strong> · failed {commerce.failedCount}
        </p>
      )}

      {orgs?.enabled && (
        <p className="text-sm text-muted">
          Organizations {orgs.orgCount} · members {orgs.memberCount}
        </p>
      )}

      {compliance?.enabled && (
        <p className="text-sm text-muted">
          Audit samples {compliance.auditLogSamples} · security samples{" "}
          {compliance.securityEventSamples}
        </p>
      )}

      {partners?.enabled && (
        <div>
          <h3 className="text-sm font-semibold">Partnership interests</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {partners.items.slice(0, 5).map((item) => (
              <li key={item._id}>{item.title}</li>
            ))}
            {partners.items.length === 0 && <li>No open partnership requests.</li>}
          </ul>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
