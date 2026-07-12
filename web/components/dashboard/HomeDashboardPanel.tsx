"use client";

import { getSessionToken } from "@/lib/auth";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  Flame,
  MessageSquare,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { memo } from "react";
import { LoadingState } from "@/components/ui/LoadingState";

export function HomeDashboardPanel() {
  const sessionToken = getSessionToken();
  const dashboard = useQuery(
    api.platformGrowth.getHomeDashboard,
    sessionToken ? { sessionToken } : "skip"
  );
  const recommendations = useQuery(
    api.platformGrowth.getRecommendations,
    sessionToken ? { sessionToken } : "skip"
  );

  if (!sessionToken) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
        <Link href="/chat/login" className="text-accent hover:underline">Sign in</Link> to see your dashboard
      </div>
    );
  }

  if (dashboard === undefined) {
    return <LoadingState label="Loading dashboard…" />;
  }

  if (!dashboard) return null;

  const goalProgress = Math.min(100, Math.round((dashboard.todayUsage.aiRequests / dashboard.dailyGoal) * 100));

  return (
    <div className="space-y-4">
      <div className="dashboard-stat-grid">
        <StatCard icon={Zap} label="Today's AI usage" value={dashboard.todayUsage.aiRequests} />
        <StatCard icon={MessageSquare} label="Chats today" value={dashboard.todayUsage.chats} />
        <StatCard icon={Flame} label="Learning streak" value={`${dashboard.streakDays}d`} />
        <StatCard icon={Target} label="Credits" value={dashboard.credits} />
      </div>

      {dashboard.continueChat && (
        <Link
          href={`/chat?c=${dashboard.continueChat.id}`}
          className="dashboard-panel-card saas-card flex items-center justify-between rounded-xl px-4 py-3 hover:border-accent/30"
        >
          <div>
            <p className="text-xs font-medium text-accent">Continue where you stopped</p>
            <p className="font-medium">{dashboard.continueChat.title}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted" aria-hidden />
        </Link>
      )}

      <div className="dashboard-panel-card saas-card rounded-xl p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Daily goal</span>
          <span className="text-muted">
            {dashboard.todayUsage.aiRequests}/{dashboard.dailyGoal} AI requests
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/30">
          <div
            className="dashboard-progress-fill h-full rounded-full bg-accent"
            style={{ width: `${goalProgress}%` }}
          />
        </div>
      </div>

      {recommendations?.items && recommendations.items.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-accent" aria-hidden />
            Recommended for you
          </h3>
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
                <Link href={`/chat?c=${c.id}`} className="block rounded-lg px-2 py-1.5 text-sm hover:bg-accent/5">
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {dashboard.achievements.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Trophy className="h-4 w-4 text-accent" aria-hidden />
            Achievements
          </h3>
          <div className="flex flex-wrap gap-2">
            {dashboard.achievements.map((a) => (
              <span
                key={a.badgeId}
                className="rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-medium"
                title={a.label}
              >
                {a.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="dashboard-quick-grid">
        {[
          { label: "Chat", href: "/chat" },
          { label: "Media", href: "/media" },
          { label: "Learn", href: "/gigalearn" },
          { label: "Wallet", href: "/wallet" },
        ].map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="rounded-xl border border-border py-2 text-center text-xs font-medium hover:border-accent/30"
          >
            {q.label}
          </Link>
        ))}
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
