"use client";

import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { BarChart3 } from "lucide-react";

type AdminCreds = { adminSessionToken: string };

export function AdminPhase5AnalyticsPanel({
  adminCreds,
}: {
  adminCreds: AdminCreds;
}) {
  const data = useQuery(api.phase5ProductAnalytics.getProductAnalyticsAdmin, adminCreds);

  if (data === undefined) {
    return <p className="text-sm text-muted">Loading product analytics…</p>;
  }

  if (!data.enabled) {
    return (
      <p className="text-sm text-muted">
        Enable <code className="text-xs">phase5.product_analytics</code> to view DAU/WAU/MAU.
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-700">
          <BarChart3 className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Product analytics</h2>
          <p className="mt-1 text-sm text-muted">{data.note}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="DAU" value={data.users.dau} />
        <Stat label="WAU" value={data.users.wau} />
        <Stat label="MAU" value={data.users.mau} />
        <Stat label="Day-7 retention %" value={data.users.day7RetentionPct} />
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="AI requests (7d)" value={data.engagement.aiRequestsLast7d} />
        <Stat label="Messages (7d)" value={data.engagement.messagesLast7d} />
        <Stat label="New users (7d)" value={data.engagement.newUsersLast7d} />
        <Stat label="Social posts (7d)" value={data.engagement.socialPostsLast7d} />
      </div>
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
