"use client";

import { ButtonLink } from "@/components/ui/Button";
import { formatGhs } from "@/lib/payments/plans";
import type { WalletCreatorSummary } from "@/lib/wallet/types";
import { formatTimestampDateTime } from "@/lib/datetime";
import { AlertCircle, Lock, Store } from "lucide-react";

type CreatorSale = {
  amountGhs: number;
  createdAt: number;
  license: string;
};

type WalletCreatorPanelProps = {
  creator: WalletCreatorSummary;
  earningsGhs: number;
  pendingPayoutGhs: number;
  recentSales: CreatorSale[];
};

export function WalletCreatorPanel({
  creator,
  earningsGhs,
  pendingPayoutGhs,
  recentSales,
}: WalletCreatorPanelProps) {
  return (
    <section className="glass rounded-2xl border border-border p-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
          <Store className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">Creator earnings</h2>
          <p className="mt-1 text-sm text-muted">
            Track marketplace sales and pending balances. Withdrawals require
            verification.
          </p>
        </div>
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border px-4 py-3">
          <dt className="text-xs text-muted">Available balance</dt>
          <dd className="mt-1 text-xl font-bold">{formatGhs(earningsGhs)}</dd>
        </div>
        <div className="rounded-xl border border-border px-4 py-3">
          <dt className="text-xs text-muted">Pending payout</dt>
          <dd className="mt-1 text-xl font-bold">
            {formatGhs(pendingPayoutGhs)}
          </dd>
        </div>
        <div className="rounded-xl border border-border px-4 py-3">
          <dt className="text-xs text-muted">Verification</dt>
          <dd className="mt-1 text-sm font-medium capitalize">
            {creator.verificationStatus}
          </dd>
        </div>
      </dl>

      {!creator.withdrawalsEnabled && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            Withdrawals are disabled until identity verification is complete.
            Earnings remain visible for tracking only.
          </p>
        </div>
      )}

      {recentSales.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold">Recent sales</h3>
          <ul className="mt-2 space-y-2">
            {recentSales.map((sale, index) => (
              <li
                key={`${sale.createdAt}-${index}`}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="text-muted">
                  {formatTimestampDateTime(sale.createdAt)} ·{" "}
                  {sale.license.replace(/_/g, " ")}
                </span>
                <span className="font-medium">{formatGhs(sale.amountGhs)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-4 flex items-start gap-2 text-sm text-muted">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>No marketplace sales yet. List a product in Creator Studio.</p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <ButtonLink href="/marketplace/sell" variant="secondary" size="sm">
          Sell on marketplace
        </ButtonLink>
        <ButtonLink href="/creator-studio" variant="ghost" size="sm">
          Creator Studio
        </ButtonLink>
      </div>
    </section>
  );
}
