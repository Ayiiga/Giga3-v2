"use client";

import { GigaSocialMonetizationAccept } from "@/components/gigasocial/economy/GigaSocialMonetizationAccept";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  fanProgressPercent,
  fansRemaining,
  formatGhs,
  monetizationStatusMessage,
} from "@/lib/gigasocial/creatorEconomy";
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
  Megaphone,
  Sparkles,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import { memo, useMemo } from "react";

export const GigaSocialCreatorDashboard = memo(function GigaSocialCreatorDashboard({
  sessionToken,
  onOpenBoost,
  onOpenAffiliate,
}: {
  sessionToken: string;
  onOpenBoost?: () => void;
  onOpenAffiliate?: () => void;
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

  const fansRequired = dashboard.fansRequired;
  const withdrawalFansRequired = dashboard.withdrawalFansRequired ?? 50;
  const statusMessage = monetizationStatusMessage({
    fanCount: dashboard.fanCount,
    fansRequired,
    withdrawalFansRequired,
    accepted: Boolean(dashboard.monetizationAccepted),
    requiresPolicyReacceptance: Boolean(dashboard.requiresPolicyReacceptance),
  });

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
            <p className="text-xs text-muted">Verified + tracked</p>
            <p className="text-xl font-bold text-foreground">
              {formatGhs(dashboard.estimatedEarningsGhs)}
            </p>
            <p className="mt-0.5 text-[11px] text-muted">
              Withdrawable {formatGhs(dashboard.payoutBalanceGhs ?? 0)}
            </p>
          </div>
        </div>
      </div>

      <section className="saas-card rounded-2xl border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground">Eligibility</h3>
        <p className="mt-1 text-sm text-foreground">{statusMessage}</p>
        <ul className="mt-3 space-y-1.5 text-xs text-muted">
          <li>Affiliate programme: Open to everyone.</li>
          <li>
            Start creator monetisation: at least {fansRequired} {FAN_LABELS.fans.toLowerCase()} +
            accept rules.
          </li>
          <li>
            Request a withdrawal: at least {withdrawalFansRequired} {FAN_LABELS.fans.toLowerCase()},
            accepted rules, and withdrawable balance.
          </li>
          <li>Boost your post to reach more people (Paystack — results not guaranteed).</li>
          <li>Tips and ad boosts work regardless of monetisation acceptance.</li>
        </ul>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/30">
          <div
            className="h-full rounded-full bg-violet-600 transition-all"
            style={{ width: `${fanProgressPercent(dashboard.fanCount, fansRequired)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          {formatCompactCount(dashboard.fanCount)} / {fansRequired} fans for monetisation
          {dashboard.fanEligible
            ? ""
            : ` · ${fansRemaining(dashboard.fanCount, fansRequired)} to go`}
          {" · "}
          {formatCompactCount(dashboard.fanCount)} / {withdrawalFansRequired} for withdrawals
        </p>
      </section>

      {dashboard.showEligibleInvite ||
      dashboard.requiresPolicyReacceptance ||
      (dashboard.fanEligible && !dashboard.monetizationAccepted) ? (
        <GigaSocialMonetizationAccept
          sessionToken={sessionToken}
          reacceptance={Boolean(dashboard.requiresPolicyReacceptance)}
        />
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onOpenBoost}
          className="saas-card flex min-h-[5.5rem] flex-col items-start justify-center rounded-2xl border border-violet-200 bg-violet-50/50 p-4 text-left hover:border-violet-300"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Megaphone className="h-4 w-4 text-violet-700" aria-hidden />
            Boost a post
          </span>
          <span className="mt-1 text-xs text-muted">
            Promote your content with a Paystack-backed campaign.
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenAffiliate}
          className="saas-card flex min-h-[5.5rem] flex-col items-start justify-center rounded-2xl border border-border bg-white p-4 text-left hover:border-accent/40"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users className="h-4 w-4 text-accent" aria-hidden />
            Affiliate programme
          </span>
          <span className="mt-1 text-xs text-muted">Open to everyone — no fan minimum.</span>
        </button>
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
            </dl>
          </div>
        </section>
      ) : null}

      {insights.length ? (
        <section className="saas-card rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-violet-700" aria-hidden />
            Growth insights
          </h3>
          <ul className="mt-2 space-y-1.5">
            {insights.map((line) => (
              <li key={line} className="text-sm text-foreground">
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted">
            Views and engagement help growth insights. Unfunded content estimates are not withdrawable
            cash. Fake engagement does not qualify.
          </p>
        </section>
      ) : null}

      <div className="gigasocial-creator-stat-grid">
        <Stat
          icon={TrendingUp}
          label="Content (estimate)"
          value={formatGhs(dashboard.contentEarningsGhs)}
        />
        <Stat icon={Gift} label="Gifts" value={formatGhs(dashboard.giftEarningsGhs)} />
        <Stat icon={Users} label="Affiliate" value={formatGhs(dashboard.affiliateEarningsGhs)} />
        <Stat icon={BarChart3} label="Ad spend" value={formatGhs(dashboard.adSpendGhs)} />
        <Stat
          icon={Eye}
          label="Views"
          value={formatCompactCount(dashboard.postPerformance.totalViews)}
        />
        <Stat
          icon={Video}
          label="Watch mins"
          value={formatCompactCount(dashboard.videoPerformance.videoWatchMinutes)}
        />
      </div>

      {dashboard.topPosts.length > 0 ? (
        <section className="saas-card rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Top posts</h3>
            {onOpenBoost ? (
              <Button type="button" size="sm" variant="outline" onClick={onOpenBoost}>
                Boost a post
              </Button>
            ) : null}
          </div>
          <ul className="mt-3 space-y-2">
            {dashboard.topPosts.map((p) => (
              <li
                key={p.postId}
                className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
              >
                <p className="line-clamp-2 text-foreground">{p.body || "(media post)"}</p>
                <p className="mt-1 text-xs text-muted">
                  {p.viewCount} views · {p.likeCount} likes · {p.commentCount} comments ·{" "}
                  {p.shareCount} shares
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
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] text-muted">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
