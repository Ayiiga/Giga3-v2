"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}

function InsightsInner() {
  const params = useSearchParams();
  const adminKey = params.get("key")?.trim() ?? "";
  const stats = useQuery(
    api.platformStats.getDashboard,
    adminKey ? { adminKey } : "skip"
  );

  const cards = useMemo(() => {
    if (!stats) return [];
    return [
      { label: "Registered users", value: stats.totalRegisteredUsers },
      { label: "PWA installs (tracked)", value: stats.pwaInstalls },
      { label: "Site visits (devices)", value: stats.siteVisits },
      { label: `Online now (last ${stats.onlineWindowMinutes} min)`, value: stats.onlineNow },
      { label: "Online registered users", value: stats.onlineRegisteredUsers },
      { label: "Online PWA sessions", value: stats.onlinePwaSessions },
    ];
  }, [stats]);

  if (!adminKey) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border bg-card p-8 text-center">
        <h1 className="text-2xl font-semibold">Giga3 AI Insights</h1>
        <p className="mt-3 text-sm text-muted">
          Add your admin key to the URL: <code className="text-foreground">/insights/?key=YOUR_KEY</code>
        </p>
      </div>
    );
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
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="rounded-2xl border bg-card p-8">
        <h1 className="text-3xl font-bold">Giga3 AI Platform Insights</h1>
        <p className="mt-2 text-sm text-muted">
          Live usage snapshot · updated {formatTime(stats.asOf)}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-muted">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{card.value}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted">
        PWA installs are counted when users add the app to their home screen (or open in standalone
        mode). Online counts use heartbeats every ~45 seconds. Historical totals grow from first
        deploy of this feature forward.
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
