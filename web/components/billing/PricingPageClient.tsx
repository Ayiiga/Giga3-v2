"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { CreditBadge } from "@/components/billing/CreditBadge";
import { SubscriptionCard } from "@/components/billing/SubscriptionCard";
import { UsageTracker } from "@/components/billing/UsageTracker";
import { Button, ButtonLink } from "@/components/ui/Button";
import {
  CREDIT_PACKS,
  FREE_TIER_FEATURES,
  PLAN_FEATURE_HIGHLIGHTS,
  SUBSCRIPTION_PRODUCTS,
  formatGhs,
} from "@/lib/payments/plans";
import { BillingErrorBanner } from "@/components/billing/BillingErrorBanner";
import { CheckoutOverlay } from "@/components/billing/CheckoutOverlay";
import { PaystackModeBadge } from "@/components/billing/PaystackModeBadge";
import { useBilling } from "@/hooks/useBilling";
import { paystackButtonLabel } from "@/lib/payments/checkoutLabels";
import { cn } from "@/lib/utils";

function PricingPageClientInner() {
  const {
    usage,
    paying,
    checkoutPhase,
    checkoutPreview,
    error,
    checkout,
    email,
    paystackMode,
    inlineEnabled,
    dismissError,
  } = useBilling();

  return (
    <div className="discover-stable mt-14 space-y-16">
      <CheckoutOverlay
        phase={checkoutPhase}
        label={checkoutPreview?.label}
        amountGhs={checkoutPreview?.amountGhs}
      />
      {email && usage && (
        <div className="mx-auto max-w-md space-y-3">
          <UsageTracker usage={usage} />
          <div className="flex justify-center">
            <CreditBadge credits={usage.credits} />
          </div>
        </div>
      )}

      {error && (
        <BillingErrorBanner message={error} onDismiss={dismissError} />
      )}

      <section>
        <h2 className="text-center text-2xl font-semibold">Subscription plans</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted">
          Pay with Paystack (GHS). Credits refill each billing period. Webhook
          activates your plan automatically.
        </p>
        <div className="mt-3 flex justify-center">
          <PaystackModeBadge mode={paystackMode} inlineEnabled={inlineEnabled} />
        </div>
        <div className="discover-card-grid discover-card-grid--3 mt-10">
          {SUBSCRIPTION_PRODUCTS.map((product) => (
            <SubscriptionCard
              key={product.id}
              product={product}
              features={[
                `${product.credits} credits / month`,
                ...PLAN_FEATURE_HIGHLIGHTS,
              ]}
              onSelect={(id) => void checkout(id)}
              loading={paying}
              loadingLabel={paystackButtonLabel(checkoutPhase, "Subscribe with Paystack")}
              disabled={!email || paying}
            />
          ))}
        </div>
        {!email && (
          <p className="mt-4 text-center text-sm text-muted">
            <ButtonLink href="/chat/login" variant="ghost" size="sm">
              Sign in
            </ButtonLink>{" "}
            to subscribe with Paystack
          </p>
        )}
      </section>

      <section>
        <article className="saas-card mx-auto max-w-lg rounded-2xl p-6">
          <h3 className="text-lg font-semibold">Free</h3>
          <p className="mt-2 text-3xl font-bold">{formatGhs(0)}</p>
          <ul className="mt-6 space-y-2 text-sm text-muted">
            {FREE_TIER_FEATURES.map((f) => (
              <li key={f}>• {f}</li>
            ))}
          </ul>
          <ButtonLink href="/chat/login" variant="secondary" size="lg" className="mt-8 w-full">
            Get started
          </ButtonLink>
        </article>
      </section>

      <section>
        <h2 className="text-center text-2xl font-semibold">Credit top-ups</h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted">
          One-time packs added to your balance (any plan).
        </p>
        <div className="discover-card-grid discover-card-grid--3 mt-10">
          {CREDIT_PACKS.map((pack) => (
            <article
              key={pack.id}
              className={cn(
                "saas-card flex flex-col rounded-2xl p-6",
                pack.highlighted && "border-violet-500/40"
              )}
            >
              <h3 className="font-semibold">{pack.label}</h3>
              <p className="mt-2 text-2xl font-bold">{formatGhs(pack.amountGhs)}</p>
              <p className="mt-2 flex-1 text-sm text-muted">{pack.description}</p>
              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={!email || paying}
                onClick={() => void checkout(pack.id)}
                className="mt-8 w-full"
              >
                {paystackButtonLabel(checkoutPhase, "Buy credits")}
              </Button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export function PricingPageClient() {
  return (
    <ConvexAppShell>
      <PricingPageClientInner />
    </ConvexAppShell>
  );
}
