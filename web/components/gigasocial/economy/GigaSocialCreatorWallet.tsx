"use client";

import { LoadingState } from "@/components/ui/LoadingState";
import { formatGhs } from "@/lib/gigasocial/creatorEconomy";
import { buildGrowthInsights } from "@/lib/gigasocial/feedRanking";
import { formatCompactCount } from "@/lib/gigasocial/ogMeta";
import { siteConfig } from "@/lib/site";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { Coins, Gift, Sparkles, Star, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { memo, useMemo } from "react";

export const GigaSocialCreatorWallet = memo(function GigaSocialCreatorWallet({
  sessionToken,
}: {
  sessionToken: string;
}) {
  const dashboard = useQuery(api.gigaSocialEconomy.getCreatorDashboard, { sessionToken });
  const gifts = useQuery(api.gigaSocialEconomy.getGiftsHub, { sessionToken });

  const insights = useMemo(() => {
    if (!dashboard) return [];
    return buildGrowthInsights({
      todayViews: dashboard.postPerformance.totalViews,
      engagementRate: dashboard.audienceInsights.engagementRate,
      topHashtags: ["GigaSocial", "CreatorZone"],
    });
  }, [dashboard]);

  if (dashboard === undefined || gifts === undefined) {
    return <LoadingState label="Loading creator wallet…" />;
  }

  if (!dashboard) {
    return (
      <p className="text-sm text-muted">Set up your GigaSocial profile to open Creator Wallet.</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="saas-card rounded-2xl border border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Wallet className="h-5 w-5 text-accent" aria-hidden />
              Creator Wallet
            </h2>
            <p className="mt-1 text-sm text-muted">
              Tips, gifts, and estimated creator earnings — withdraw via Giga3 Wallet when settled.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Estimated balance</p>
            <p className="text-2xl font-bold text-foreground">
              {formatGhs(dashboard.estimatedEarningsGhs)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <WalletStat icon={Gift} label="Tips & gifts" value={formatGhs(dashboard.giftEarningsGhs)} />
        <WalletStat
          icon={Coins}
          label="Content rewards"
          value={formatGhs(dashboard.contentEarningsGhs)}
        />
        <WalletStat
          icon={Users}
          label="Affiliate"
          value={formatGhs(dashboard.affiliateEarningsGhs)}
        />
        <WalletStat
          icon={Star}
          label="Gifts received"
          value={formatCompactCount(gifts?.totalGifts ?? 0)}
        />
      </div>

      <section className="saas-card rounded-2xl border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground">Monetization rails</h3>
        <ul className="mt-2 space-y-1.5 text-sm text-muted">
          <li>Tips & Creator Stars — fans tip from any post</li>
          <li>Paid communities & subscriptions — via Giga3 Wallet</li>
          <li>Premium content & affiliate marketplace</li>
          <li>Creator challenges, weekly & referral rewards</li>
          <li>AI credit rewards for consistent publishing</li>
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={siteConfig.links.wallet}
            className="inline-flex min-h-9 items-center rounded-full border border-border px-3 text-xs font-medium text-foreground hover:bg-muted/10"
          >
            Open Giga3 Wallet
          </Link>
          <Link
            href="/gigasocial/?tab=creator"
            className="inline-flex min-h-9 items-center rounded-full border border-violet-200 bg-violet-50 px-3 text-xs font-medium text-violet-900"
          >
            Creator tools
          </Link>
        </div>
      </section>

      <section className="saas-card rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-violet-700" aria-hidden />
          AI Growth Assistant
        </h3>
        <ul className="mt-2 space-y-2">
          {insights.map((line) => (
            <li
              key={line}
              className="rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm text-foreground"
            >
              {line}
            </li>
          ))}
          <li className="rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm text-foreground">
            Thumbnail tip: high-contrast faces outperform text-only covers on mobile.
          </li>
          <li className="rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm text-foreground">
            Caption tip: lead with a hook, end with a question, keep 3–5 hashtags.
          </li>
        </ul>
      </section>
    </div>
  );
});

function WalletStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet;
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
