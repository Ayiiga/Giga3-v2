"use client";

import { SubscriptionCard } from "@/components/billing/SubscriptionCard";
import { UsageTracker } from "@/components/billing/UsageTracker";
import { ButtonLink } from "@/components/ui/Button";
import type { UsageSnapshot } from "@/lib/credits/constants";
import {
  FUTURE_PLAN_LABEL,
  planEntitlements,
  walletPlanLabel,
} from "@/lib/wallet/planLabels";
import type { WalletDashboard } from "@/lib/wallet/types";
import {
  PLAN_FEATURE_HIGHLIGHTS,
  SUBSCRIPTION_PRODUCTS,
} from "@/lib/payments/plans";
import { formatExpiry } from "@/lib/credits/rules";
import { Check, Lock } from "lucide-react";

type WalletSubscriptionPanelProps = {
  dashboard: WalletDashboard;
  usage: UsageSnapshot | null;
  onCheckout: (productId: string) => void;
  checkoutLoading: boolean;
  checkoutLabel: string;
};

export function WalletSubscriptionPanel({
  dashboard,
  usage,
  onCheckout,
  checkoutLoading,
  checkoutLabel,
}: WalletSubscriptionPanelProps) {
  const planId = dashboard.subscription.planId;
  const entitlements = planEntitlements(planId);

  return (
    <div className="space-y-8">
      <section className="glass rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold">Current plan</h2>
        <p className="mt-1 text-sm text-muted">
          {walletPlanLabel(planId)} — server-validated subscription status
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Status</dt>
            <dd className="font-medium">
              {dashboard.subscription.active ? "Active" : "Free tier"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Renews</dt>
            <dd className="font-medium">
              {formatExpiry(dashboard.subscription.expiresAt)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Starter credits</dt>
            <dd className="font-medium">
              {dashboard.subscription.starterCredits} (one-time)
            </dd>
          </div>
          <div>
            <dt className="text-muted">Daily free credits</dt>
            <dd className="font-medium">
              {dashboard.subscription.dailyFreeCredits > 0
                ? `${dashboard.subscription.dailyFreeCredits} / day (configured)`
                : "Not configured"}
            </dd>
          </div>
        </dl>
        {usage && (
          <div className="mt-6">
            <UsageTracker usage={usage} />
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Plan entitlements</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {entitlements.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm"
            >
              {item.included ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <Lock className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              )}
              <span className={item.included ? "" : "text-muted"}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          {FUTURE_PLAN_LABEL} tier is future-ready — contact support for
          custom billing.
        </p>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Upgrade or change plan</h2>
            <p className="text-sm text-muted">
              Payments verified server-side via Paystack — never trust client
              confirmation alone.
            </p>
          </div>
          <ButtonLink href="/subscribe" variant="ghost" size="sm">
            Open full subscribe page
          </ButtonLink>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {SUBSCRIPTION_PRODUCTS.map((product) => (
            <SubscriptionCard
              key={product.id}
              product={product}
              features={[
                `${product.credits} credits / month`,
                ...PLAN_FEATURE_HIGHLIGHTS,
              ]}
              onSelect={(id) => onCheckout(id)}
              loading={checkoutLoading}
              loadingLabel={checkoutLabel}
              disabled={checkoutLoading}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
