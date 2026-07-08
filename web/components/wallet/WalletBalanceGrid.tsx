"use client";

import type { WalletBalances } from "@/lib/wallet/types";
import { formatGhs } from "@/lib/payments/plans";
import { cn } from "@/lib/utils";
import {
  Coins,
  Film,
  Sparkles,
  Store,
  Trophy,
} from "lucide-react";

type WalletBalanceGridProps = {
  balances: WalletBalances;
  className?: string;
};

function BalanceCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Coins;
  accent: string;
}) {
  return (
    <article className="glass rounded-2xl border border-border p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        <span
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-xl",
            accent
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </article>
  );
}

export function WalletBalanceGrid({ balances, className }: WalletBalanceGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 xl:grid-cols-4",
        className
      )}
    >
      <BalanceCard
        label="Chat credits"
        value={String(balances.chatCredits)}
        hint="AI chat, writing, research & media"
        icon={Coins}
        accent="bg-violet-500/10 text-violet-600"
      />
      <BalanceCard
        label="Video credits"
        value={String(balances.videoCredits)}
        hint="Video AI studio generations"
        icon={Film}
        accent="bg-sky-500/10 text-sky-600"
      />
      <BalanceCard
        label="Reward points"
        value={String(balances.rewardPoints)}
        hint={`GigaSocial level ${balances.rewardLevel}`}
        icon={Trophy}
        accent="bg-amber-500/10 text-amber-600"
      />
      <BalanceCard
        label="Creator earnings"
        value={formatGhs(balances.creatorEarningsGhs)}
        hint={
          balances.creatorPendingPayoutGhs > 0
            ? `${formatGhs(balances.creatorPendingPayoutGhs)} pending review`
            : "Marketplace sales balance"
        }
        icon={Store}
        accent="bg-emerald-500/10 text-emerald-600"
      />
    </div>
  );
}

export function WalletSubscriptionBadge({
  planLabel,
  active,
}: {
  planLabel: string;
  active: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm">
      <Sparkles className="h-4 w-4 text-violet-500" aria-hidden />
      <span className="font-medium">{planLabel}</span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-xs font-medium",
          active
            ? "bg-emerald-500/10 text-emerald-700"
            : "bg-muted/20 text-muted"
        )}
      >
        {active ? "Active" : "Free tier"}
      </span>
    </div>
  );
}
