"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { AdminKeyGate } from "@/components/admin/AdminKeyGate";
import { useAdminSession } from "@/hooks/useAdminSession";
import { getAdminSessionToken } from "@/lib/adminAuth";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const REFRESH_MS = 30_000;

type DailyTrendPoint = { dateKey: string; messages: number; aiRequests: number };
type NamedValue = { name: string; value: number };
type AiModelUsageRow = {
  provider: string;
  requests: number;
  avgLatencyMs: number;
  fallbacks: number;
};

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm dark:bg-card">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function InsightsInner() {
  const admin = useAdminSession();
  const adminCreds = useMemo(() => {
    const token = getAdminSessionToken();
    return token ? { adminSessionToken: token } : null;
  }, [admin.authorized, admin.ready]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((t) => t + 1), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  const stats = useQuery(
    api.platformStats.getDashboard,
    adminCreds ?? "skip"
  );

  const activityChart = useMemo(() => {
    if (!stats?.dailyTrend?.length) return null;
    return {
      labels: stats.dailyTrend.map((d: DailyTrendPoint) => d.dateKey.slice(5)),
      datasets: [
        {
          label: "Messages",
          data: stats.dailyTrend.map((d: DailyTrendPoint) => d.messages),
          borderColor: "#7c3aed",
          backgroundColor: "rgba(124, 58, 237, 0.12)",
          fill: true,
          tension: 0.35,
        },
        {
          label: "AI requests",
          data: stats.dailyTrend.map((d: DailyTrendPoint) => d.aiRequests),
          borderColor: "#0ea5e9",
          backgroundColor: "rgba(14, 165, 233, 0.08)",
          fill: false,
          tension: 0.35,
        },
      ],
    };
  }, [stats]);

  const deviceChart = useMemo(() => {
    const devices = stats?.breakdown?.devices ?? [];
    if (!devices.length) return null;
    return {
      labels: devices.map((d: NamedValue) => d.name),
      datasets: [
        {
          data: devices.map((d: NamedValue) => d.value),
          backgroundColor: ["#7c3aed", "#0ea5e9", "#22c55e", "#f59e0b", "#94a3b8"],
        },
      ],
    };
  }, [stats]);

  const browserChart = useMemo(() => {
    const rows = stats?.breakdown?.browsers?.slice(0, 6) ?? [];
    if (!rows.length) return null;
    return {
      labels: rows.map((d: NamedValue) => d.name),
      datasets: [
        {
          label: "Sessions",
          data: rows.map((d: NamedValue) => d.value),
          backgroundColor: "#7c3aed",
          borderRadius: 8,
        },
      ],
    };
  }, [stats]);

  if (!admin.authorized) {
    return (
      <AdminKeyGate
        ready={admin.ready}
        authorized={admin.authorized}
        error={admin.error}
        pendingKey={admin.pendingKey}
        onPendingKeyChange={admin.setPendingKey}
        onSubmit={() => void admin.submitKey()}
        title="Giga3 AI Insights"
      />
    );
  }

  if (!adminCreds) {
    return <p className="text-center text-muted">Session expired. Sign in again.</p>;
  }

  if (stats === undefined) {
    return <p className="text-center text-muted">Loading platform stats…</p>;
  }

  if (stats === null) {
    return (
      <p className="text-center text-red-600">
        Unauthorized — check PLATFORM_STATS_ADMIN_KEY or QUALITY_DASHBOARD_ADMIN_KEY on Convex.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-2">
      <header className="rounded-2xl border bg-gradient-to-br from-violet-600 to-indigo-700 p-8 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Giga3 AI Platform Insights</h1>
            <p className="mt-2 text-sm text-violet-100">
              Live analytics · refreshed every 30s · last update {formatTime(stats.asOf)}
            </p>
          </div>
          {admin.authorized && (
            <a
              href="/admin/"
              className="rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/25"
            >
              Revenue &amp; marketplace admin →
            </a>
          )}
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Registered users" value={stats.totalRegisteredUsers} />
        <StatCard label="Online now" value={stats.onlineNow} hint={`${stats.onlineWindowMinutes} min window`} />
        <StatCard label="DAU" value={stats.dau} />
        <StatCard label="WAU / MAU" value={`${stats.wau} / ${stats.mau}`} />
        <StatCard label="New users today" value={stats.newUsersToday} />
        <StatCard label="Messages today" value={stats.messagesToday} />
        <StatCard label="Conversations today" value={stats.conversationsToday} />
        <StatCard label="AI requests today" value={stats.aiRequestsToday} />
        <StatCard label="Avg response time" value={`${stats.avgResponseTimeMs} ms`} />
        <StatCard label="Error rate" value={`${stats.errorRate}%`} />
        <StatCard label="Failed requests" value={stats.failedRequestsToday} />
        <StatCard label="Peak concurrent" value={stats.peakConcurrentUsers} />
        <StatCard label="PWA installs" value={stats.pwaInstalls} />
        <StatCard label="Install conversion" value={`${stats.installConversionRate}%`} />
        <StatCard label="Online registered" value={stats.onlineRegisteredUsers} />
        <StatCard label="Online PWA" value={stats.onlinePwaSessions} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6 shadow-sm dark:bg-card">
          <h2 className="text-lg font-semibold">Activity trend (14 days)</h2>
          {activityChart ? (
            <div className="mt-4 h-64">
              <Line
                data={activityChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom" } },
                  scales: { y: { beginAtZero: true } },
                }}
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">No trend data yet.</p>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm dark:bg-card">
          <h2 className="text-lg font-semibold">Device breakdown (online)</h2>
          {deviceChart ? (
            <div className="mt-4 mx-auto h-64 max-w-xs">
              <Doughnut data={deviceChart} options={{ plugins: { legend: { position: "bottom" } } }} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">No device data yet.</p>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6 shadow-sm dark:bg-card">
          <h2 className="text-lg font-semibold">Browsers (online)</h2>
          {browserChart ? (
            <div className="mt-4 h-56">
              <Bar
                data={browserChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true } },
                }}
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">No browser data yet.</p>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm dark:bg-card">
          <h2 className="text-lg font-semibold">AI model usage today</h2>
          <ul className="mt-4 space-y-3">
            {stats.aiModelUsage.length === 0 ? (
              <li className="text-sm text-muted">No AI usage recorded today.</li>
            ) : (
              stats.aiModelUsage.map((row: AiModelUsageRow) => (
                <li
                  key={row.provider}
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm"
                >
                  <span className="font-medium">{row.provider}</span>
                  <span className="text-muted">
                    {row.requests} req · {row.avgLatencyMs} ms avg
                    {row.fallbacks > 0 ? ` · ${row.fallbacks} fallback` : ""}
                  </span>
                </li>
              ))
            )}
          </ul>
          <p className="mt-4 text-xs text-muted">
            Token usage today: {stats.tokenUsage.toLocaleString()} · Est. cost ${stats.estimatedAiCostUsd}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm dark:bg-card">
        <h2 className="text-lg font-semibold">Retention & returning users</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <StatCard label="Returning today" value={stats.returningUsersToday} />
          <StatCard label="1-day retention %" value={stats.retention.day1} />
          <StatCard label="7-day retention %" value={stats.retention.day7} />
          <StatCard label="30-day retention %" value={stats.retention.day30} />
        </div>
      </section>

      <p className="text-xs text-muted">
        Metrics accumulate from this release forward. Heartbeats run every ~45 seconds. Set{" "}
        <code className="text-foreground">PLATFORM_STATS_ADMIN_KEY</code> on Convex production.
      </p>
    </div>
  );
}

export default function InsightsPage() {
  return (
    <ConvexAppShell>
      <div className="marketing-stable py-8 sm:py-12">
        <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
          <InsightsInner />
        </Suspense>
      </div>
    </ConvexAppShell>
  );
}
