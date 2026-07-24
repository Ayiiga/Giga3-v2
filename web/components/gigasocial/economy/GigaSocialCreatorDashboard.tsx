"use client";

import { LoadingState } from "@/components/ui/LoadingState";
import { formatGhs, fanProgressPercent } from "@/lib/gigasocial/creatorEconomy";
import {
  creatorLevelProgress,
  formatCreatorRanks,
  nextCreatorLevel,
  resolveCreatorLevel,
} from "@/lib/gigasocial/creatorLevels";
import { FAN_LABELS } from "@/lib/gigasocial/fanBranding";
import { buildGrowthInsights } from "@/lib/gigasocial/feedRanking";
import { useGigaSocialFeatures } from "@/lib/gigasocial/featureFlags";
import { formatCompactCount } from "@/lib/gigasocial/ogMeta";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import {
  Award,
  BarChart3,
  Eye,
  Gift,
  Lock,
  Sparkles,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import { memo, useMemo } from "react";

export const GigaSocialCreatorDashboard = memo(function GigaSocialCreatorDashboard({
  sessionToken,
}: {
  sessionToken: string;
}) {
  const features = useGigaSocialFeatures();
  const dashboard = useQuery(api.gigaSocialEconomy.getCreatorDashboard, { sessionToken });

  const levelDef = useMemo(
    () => resolveCreatorLevel(dashboard?.level ?? 1),
    [dashboard?.level]
  );
  const nextLevel = useMemo(
    () => nextCreatorLevel(dashboard?.level ?? 1),
    [dashboard?.level]
  );
  const ranks = useMemo(
    () =>
      formatCreatorRanks({
        fanCount: dashboard?.fanCount ?? 0,
        engagementRate: dashboard?.audienceInsights.engagementRate ?? 0,
        countryHint: "Africa",
      }),
    [dashboard?.audienceInsights.engagementRate, dashboard?.fanCount]
  );
  const insights = useMemo(() => {
    if (!dashboard) return [];
    return buildGrowthInsights({
      todayViews: dashboard.postPerformance.totalViews,
      engagementRate: dashboard.audienceInsights.engagementRate,
    });
  }, [dashboard]);

  if (dashboard === undefined) {
    return <LoadingState label="Loading creator dashboard…" />;
  }

  if (!dashboard) {
    return (
      <p className="text-sm text-muted">Set up your GigaSocial profile to access creator tools.</p>
    );
  }

  if (!dashboard.unlocked) {
    return (
      <div className="saas-card rounded-2xl border border-border p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <Lock className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Creator Dashboard</h2>
            <p className="mt-1 text-sm text-muted">
              Unlock at {dashboard.fansRequired} {FAN_LABELS.fans.toLowerCase()}. You have{" "}
              {formatCompactCount(dashboard.fanCount)}.
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted/30">
              <div
                className="h-full rounded-full bg-violet-600 transition-all"
                style={{ width: `${fanProgressPercent(dashboard.fanCount, dashboard.fansRequired)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              {fanProgressPercent(dashboard.fanCount, dashboard.fansRequired)}% — tips and ad boosts
              already work. Affiliate and payout tools unlock at {dashboard.fansRequired} fans.
            </p>
            {features.enableCreatorLevels ? (
              <p className="mt-3 text-xs text-muted">
                Current track: <span className="font-medium text-foreground">{levelDef.label}</span>
                {nextLevel ? ` · next ${nextLevel.label}` : ""}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="saas-card rounded-2xl border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Creator Dashboard</h2>
            <p className="text-sm text-muted">
              Level {dashboard.level} · {formatCompactCount(dashboard.fanCount)} {FAN_LABELS.fans}
              {features.enableCreatorLevels ? ` · ${levelDef.label}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Estimated earnings</p>
            <p className="text-xl font-bold text-foreground">
              {formatGhs(dashboard.estimatedEarningsGhs)}
            </p>
          </div>
        </div>
      </div>

      {features.enableCreatorLevels ? (
        <section className="saas-card rounded-2xl border border-border p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Award className="h-4 w-4 text-accent" aria-hidden />
            Creator level & ranks
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-lg font-semibold text-foreground">{levelDef.label}</p>
              <p className="text-xs text-muted">
                {nextLevel
                  ? `${creatorLevelProgress(dashboard.level)}% to ${nextLevel.label}`
                  : "Max track unlocked"}
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/30">
                <div
                  className="h-full rounded-full bg-violet-600"
                  style={{ width: `${creatorLevelProgress(dashboard.level)}%` }}
                />
              </div>
              <ul className="mt-2 space-y-0.5 text-[11px] text-muted">
                {levelDef.unlocks.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <dl className="grid grid-cols-1 gap-2 text-sm">
              <div>
                <dt className="text-muted">Creator Rank</dt>
                <dd className="font-semibold text-foreground">{ranks.creatorRank}</dd>
              </div>
              <div>
                <dt className="text-muted">Local Rank</dt>
                <dd className="font-semibold text-foreground">{ranks.localRank}</dd>
              </div>
              <div>
                <dt className="text-muted">Country Rank</dt>
                <dd className="font-semibold text-foreground">{ranks.countryRank}</dd>
              </div>
              {dashboard.badges?.length ? (
                <div>
                  <dt className="text-muted">Badges</dt>
                  <dd className="font-semibold text-foreground">
                    {dashboard.badges.slice(0, 4).join(" · ")}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </section>
      ) : null}

      {insights.length ? (
        <section className="saas-card rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-violet-700" aria-hidden />
            AI insights
          </h3>
          <ul className="mt-2 space-y-1.5">
            {insights.map((line) => (
              <li key={line} className="text-sm text-foreground">
                {line}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="gigasocial-creator-stat-grid">
        <Stat icon={TrendingUp} label="Content" value={formatGhs(dashboard.contentEarningsGhs)} />
        <Stat icon={Gift} label="Gifts" value={formatGhs(dashboard.giftEarningsGhs)} />
        <Stat icon={Users} label="Affiliate" value={formatGhs(dashboard.affiliateEarningsGhs)} />
        <Stat icon={BarChart3} label="Ad spend" value={formatGhs(dashboard.adSpendGhs)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="saas-card rounded-2xl border border-border p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Eye className="h-4 w-4 text-accent" aria-hidden />
            Post performance
          </h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Metric label="Posts" value={String(dashboard.postPerformance.postCount)} />
            <Metric label="Views" value={formatCompactCount(dashboard.postPerformance.totalViews)} />
            <Metric label="Likes" value={formatCompactCount(dashboard.postPerformance.totalLikes)} />
            <Metric
              label="Engagement"
              value={formatCompactCount(
                dashboard.postPerformance.totalComments + dashboard.postPerformance.totalShares
              )}
            />
          </dl>
        </section>

        <section className="saas-card rounded-2xl border border-border p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Video className="h-4 w-4 text-accent" aria-hidden />
            Video performance
          </h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Metric label="Videos" value={String(dashboard.videoPerformance.videoCount)} />
            <Metric label="Views" value={formatCompactCount(dashboard.videoPerformance.videoViews)} />
            <Metric
              label="Watch time"
              value={`${dashboard.videoPerformance.videoWatchMinutes} min`}
            />
            <Metric
              label="Engagement rate"
              value={`${dashboard.audienceInsights.engagementRate}`}
            />
          </dl>
        </section>
      </div>

      {dashboard.topPosts.length > 0 ? (
        <section className="saas-card rounded-2xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">Top-performing posts</h3>
          <ul className="mt-3 space-y-2">
            {dashboard.topPosts.map((post) => (
              <li
                key={post.postId}
                className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
              >
                <p className="line-clamp-2 text-foreground">{post.body || "Media post"}</p>
                <p className="mt-1 text-xs text-muted">
                  {formatCompactCount(post.viewCount)} views · {formatCompactCount(post.likeCount)}{" "}
                  likes · {formatCompactCount(post.commentCount)} comments
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
});

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold text-foreground">{value}</dd>
    </div>
  );
}
