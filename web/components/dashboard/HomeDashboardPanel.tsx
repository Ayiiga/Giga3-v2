"use client";

import { getSessionToken, getUserEmail } from "@/lib/auth";
import {
  HOME_DESTINATIONS,
  buildHomeGreeting,
  listSyncHomeResumeItems,
  type HomeResumeItem,
} from "@/lib/chat/homeContinuity";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  Flame,
  MessageSquare,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { memo, useEffect, useMemo, useState } from "react";
import { LoadingState } from "@/components/ui/LoadingState";

/**
 * Value-first dashboard: resume unfinished work, open destinations,
 * then light activity signals. Chat remains the primary home at /chat.
 */
export function HomeDashboardPanel() {
  const sessionToken = getSessionToken();
  const email = getUserEmail();
  const dashboard = useQuery(
    api.platformGrowth.getHomeDashboard,
    sessionToken ? { sessionToken } : "skip"
  );
  const recommendations = useQuery(
    api.platformGrowth.getRecommendations,
    sessionToken ? { sessionToken } : "skip"
  );

  const greeting = useMemo(() => buildHomeGreeting({ email }), [email]);
  const [localResume, setLocalResume] = useState<HomeResumeItem[]>([]);

  useEffect(() => {
    setLocalResume(listSyncHomeResumeItems(3));
  }, []);

  if (!sessionToken) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
        <Link href="/chat/login" className="text-accent hover:underline">
          Sign in
        </Link>{" "}
        to resume your work and see personalized recommendations.
      </div>
    );
  }

  if (dashboard === undefined) {
    return <LoadingState label="Loading dashboard…" />;
  }

  if (!dashboard) return null;

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {greeting.title}
        </h2>
        <p className="mt-1 text-sm text-muted">{greeting.subtitle}</p>
        <Link
          href="/chat"
          className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:opacity-95"
        >
          Open AI Chat
        </Link>
      </header>

      {dashboard.continueChat && (
        <Link
          href={`/chat?c=${dashboard.continueChat.id}`}
          className="dashboard-panel-card saas-card flex items-center justify-between rounded-xl px-4 py-3 hover:border-accent/30"
        >
          <div>
            <p className="text-xs font-medium text-accent">Continue chat</p>
            <p className="font-medium">{dashboard.continueChat.title}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted" aria-hidden />
        </Link>
      )}

      {localResume.length > 0 && (
        <section aria-label="Unfinished work on this device">
          <h3 className="mb-2 text-sm font-semibold">On this device</h3>
          <ul className="space-y-1.5">
            {localResume.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm hover:border-accent/30"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{item.label}</span>
                    <span className="block truncate text-xs text-muted">{item.detail}</span>
                  </span>
                  <span className="shrink-0 text-xs font-medium text-accent">Open</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Destinations">
        <h3 className="mb-2 text-sm font-semibold">Destinations</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {HOME_DESTINATIONS.map((d) => (
            <Link
              key={d.id}
              href={d.href}
              className="rounded-xl border border-border px-3 py-2.5 text-center hover:border-accent/30"
            >
              <p className="text-sm font-semibold">{d.label}</p>
              <p className="mt-0.5 text-[11px] text-muted">{d.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {recommendations?.items && recommendations.items.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-accent" aria-hidden />
            Recommended for you
          </h3>
          <p className="mb-2 text-xs text-muted">
            Based on your role and preferences — not fabricated popularity.
          </p>
          <div className="dashboard-rec-grid">
            {recommendations.items.slice(0, 4).map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="rounded-xl border border-border px-3 py-2 text-sm hover:border-accent/30"
              >
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-muted">{item.description}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {dashboard.recentChats.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Recent chats</h3>
          <ul className="space-y-1">
            {dashboard.recentChats.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/chat?c=${c.id}`}
                  className="block rounded-lg px-2 py-1.5 text-sm hover:bg-accent/5"
                >
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="dashboard-stat-grid">
        <StatCard icon={Zap} label="AI requests today" value={dashboard.todayUsage.aiRequests} />
        <StatCard icon={MessageSquare} label="Chats today" value={dashboard.todayUsage.chats} />
        <StatCard icon={Flame} label="Learning streak" value={`${dashboard.streakDays}d`} />
        <StatCard icon={Target} label="Credits" value={dashboard.credits} />
      </div>
    </div>
  );
}

const StatCard = memo(function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Zap;
  label: string;
  value: string | number;
}) {
  return (
    <div className="dashboard-stat-card saas-card rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 text-muted">
        <Icon className="h-4 w-4" aria-hidden />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
});
