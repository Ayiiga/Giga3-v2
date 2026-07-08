"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { BillingErrorBanner } from "@/components/billing/BillingErrorBanner";
import { CheckoutOverlay } from "@/components/billing/CheckoutOverlay";
import { PaystackModeBadge } from "@/components/billing/PaystackModeBadge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ButtonLink } from "@/components/ui/Button";
import {
  WalletBalanceGrid,
  WalletSubscriptionBadge,
} from "@/components/wallet/WalletBalanceGrid";
import { WalletBillingPanel } from "@/components/wallet/WalletBillingPanel";
import { WalletCreatorPanel } from "@/components/wallet/WalletCreatorPanel";
import { WalletSubscriptionPanel } from "@/components/wallet/WalletSubscriptionPanel";
import { WalletUsagePanel } from "@/components/wallet/WalletUsagePanel";
import { useBilling } from "@/hooks/useBilling";
import { useWallet } from "@/hooks/useWallet";
import { paystackButtonLabel } from "@/lib/payments/checkoutLabels";
import {
  getActivePaymentProvider,
  PAYMENT_PROVIDERS,
} from "@/lib/payments/providers";
import { walletPlanLabel } from "@/lib/wallet/planLabels";
import type { WalletTab } from "@/lib/wallet/types";
import { cn } from "@/lib/utils";
import { CreditCard, LayoutGrid, Receipt, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

const TABS: Array<{ id: WalletTab; label: string; icon: typeof LayoutGrid }> = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "subscription", label: "Subscription", icon: Sparkles },
  { id: "billing", label: "Billing", icon: Receipt },
  { id: "usage", label: "Credit usage", icon: CreditCard },
];

function WalletPageClientInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: WalletTab =
    tabParam === "subscription" ||
    tabParam === "billing" ||
    tabParam === "usage"
      ? tabParam
      : "overview";

  const {
    sessionToken,
    dashboard,
    payments,
    transactions,
    creditLogs,
    videoCreditLogs,
    creatorRevenue,
    loading,
  } = useWallet();

  const {
    email,
    usage,
    paying,
    checkoutPhase,
    checkoutPreview,
    error,
    checkout,
    paystackMode,
    inlineEnabled,
    dismissError,
  } = useBilling();

  useEffect(() => {
    if (!email) router.replace("/chat/login?next=/wallet");
  }, [email, router]);

  const activeProvider = useMemo(() => getActivePaymentProvider(), []);

  if (!email) {
    return <p className="text-center text-muted">Redirecting…</p>;
  }

  if (loading || !dashboard || !payments || !transactions) {
    return <LoadingState label="Loading GigaWallet…" className="py-16" />;
  }

  const planLabel = walletPlanLabel(dashboard.subscription.planId);
  const recentSales =
    creatorRevenue?.sales?.map((row: { purchase: { amountGhs: number; createdAt: number; license: string } }) => ({
      amountGhs: row.purchase.amountGhs,
      createdAt: row.purchase.createdAt,
      license: row.purchase.license,
    })) ?? [];

  return (
    <div className="space-y-8">
      <CheckoutOverlay
        phase={checkoutPhase}
        label={checkoutPreview?.label}
        amountGhs={checkoutPreview?.amountGhs}
      />

      <div className="text-center sm:text-left">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1 text-sm font-medium text-violet-700">
          GigaWallet
        </div>
        <h1 className="page-title">Your digital economy</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Credits, subscriptions, creator earnings, and billing — secured with
          server-side validation and Paystack verification.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
          <WalletSubscriptionBadge
            planLabel={planLabel}
            active={dashboard.subscription.active}
          />
          <PaystackModeBadge mode={paystackMode} inlineEnabled={inlineEnabled} />
        </div>
      </div>

      {error && (
        <BillingErrorBanner message={error} onDismiss={dismissError} />
      )}

      <nav
        className="flex flex-wrap gap-2 border-b border-border pb-1"
        aria-label="Wallet sections"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const href =
            tab.id === "overview" ? "/wallet" : `/wallet?tab=${tab.id}`;
          return (
            <Link
              key={tab.id}
              href={href}
              className={cn(
                "inline-flex items-center gap-2 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-b-2 border-violet-500 text-foreground"
                  : "text-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {activeTab === "overview" && (
        <div className="space-y-8">
          <WalletBalanceGrid balances={dashboard.balances} />
          <section className="glass rounded-2xl border border-border p-6">
            <h2 className="text-lg font-semibold">Payment provider</h2>
            <p className="mt-1 text-sm text-muted">
              Active: <strong>{activeProvider.label}</strong> — interchangeable
              provider layer for future Stripe, PayPal, and mobile money.
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {PAYMENT_PROVIDERS.map((provider) => (
                <li
                  key={provider.id}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm",
                    provider.available
                      ? "border-violet-500/30 bg-violet-500/5"
                      : "border-border text-muted"
                  )}
                >
                  <span className="font-medium">{provider.label}</span>
                  <span className="ml-2 text-xs">
                    {provider.available ? "Active" : "Planned"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          {dashboard.creator && (
            <WalletCreatorPanel
              creator={dashboard.creator}
              earningsGhs={dashboard.balances.creatorEarningsGhs}
              pendingPayoutGhs={dashboard.balances.creatorPendingPayoutGhs}
              recentSales={recentSales}
            />
          )}
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/credits" variant="secondary">
              Buy credits
            </ButtonLink>
            <ButtonLink href="/subscribe" variant="secondary">
              Manage subscription
            </ButtonLink>
            <ButtonLink href="/gigasocial" variant="ghost">
              Earn reward points
            </ButtonLink>
          </div>
        </div>
      )}

      {activeTab === "subscription" && (
        <WalletSubscriptionPanel
          dashboard={dashboard}
          usage={usage}
          onCheckout={(id) => void checkout(id)}
          checkoutLoading={paying}
          checkoutLabel={paystackButtonLabel(
            checkoutPhase,
            "Subscribe with Paystack"
          )}
        />
      )}

      {activeTab === "billing" && (
        <WalletBillingPanel payments={payments} transactions={transactions} />
      )}

      {activeTab === "usage" && (
        <WalletUsagePanel
          dashboard={dashboard}
          creditLogs={creditLogs}
          videoCreditLogs={videoCreditLogs}
        />
      )}

      {!sessionToken && (
        <p className="text-center text-xs text-muted">
          Session expired — sign in again to refresh wallet data.
        </p>
      )}
    </div>
  );
}

export function WalletPageClient() {
  return (
    <ConvexAppShell>
      <WalletPageClientInner />
    </ConvexAppShell>
  );
}
