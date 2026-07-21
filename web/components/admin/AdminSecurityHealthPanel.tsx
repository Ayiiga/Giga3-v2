"use client";

import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";

type AdminCreds = { adminSessionToken: string };

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

/** Read-only security events + system health for authorized admins. */
export function AdminSecurityHealthPanel({ adminCreds }: { adminCreds: AdminCreds }) {
  const security = useQuery(api.securityMonitoring.getSecurityDashboard, {
    ...adminCreds,
    hours: 24,
  });
  const health = useQuery(api.systemHealth.getSystemHealth, adminCreds);

  if (security === undefined || health === undefined) {
    return <p className="text-sm text-muted">Loading security & system health…</p>;
  }

  const services = Object.entries(health.services ?? {});

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Security & system health</h2>
        <p className="mt-1 text-sm text-muted">
          Last 24h security events and service snapshots. No secrets are shown.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-card p-5">
          <div className="text-sm text-muted">Security events (24h)</div>
          <div className="text-2xl font-bold">{security.total}</div>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <div className="text-sm text-muted">High severity (24h)</div>
          <div className="text-2xl font-bold">{security.bySeverity?.high ?? 0}</div>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <div className="text-sm text-muted">Events today (index)</div>
          <div className="text-2xl font-bold">{health.securityEventCount}</div>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <div className="text-sm text-muted">Reported uptime %</div>
          <div className="text-2xl font-bold">{health.uptimePercent}</div>
        </div>
      </div>

      {services.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(([name, snap]) => (
            <div key={name} className="rounded-2xl border bg-card p-4">
              <div className="text-sm font-medium">{name}</div>
              <div className="mt-1 text-sm text-muted">
                {snap.status}
                {typeof snap.latencyMs === "number" ? ` · ${snap.latencyMs}ms` : ""}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {security.recent.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-muted">
          No security events in the last 24 hours.
        </p>
      ) : (
        <ul className="space-y-2">
          {security.recent.slice(0, 20).map((row, idx) => (
            <li
              key={`${row.eventType}-${row.createdAt}-${idx}`}
              className="rounded-xl border bg-card px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">
                  {row.eventType} · {row.severity}
                </span>
                <span className="text-xs text-muted">{formatTime(row.createdAt)}</span>
              </div>
              <p className="mt-1 text-muted">{row.message}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
