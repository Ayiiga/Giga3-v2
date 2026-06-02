"use client";

import { CreditBadge } from "@/components/billing/CreditBadge";
import { SubscriptionCard } from "@/components/billing/SubscriptionCard";
import { UsageTracker } from "@/components/billing/UsageTracker";
import { ButtonLink } from "@/components/ui/Button";
import {
  CREDIT_PACKS,
  FREE_TIER_FEATURES,
  PLAN_FEATURE_HIGHLIGHTS,
  SUBSCRIPTION_PRODUCTS,
  formatGhs,
} from "@/lib/payments/plans";
import { FREE_STARTER_CREDITS } from "@/lib/payments/subscriptionCatalog";
import { useBilling } from "@/hooks/useBilling";
import { cn } from "@/lib/utils";

export function PricingPageClient() {
  const { usage, paying, error, checkout, email } = useBilling();

  return (
    <div className="mt-14 space-y-16">
      {email && usage && (
        <div className="mx-auto max-w-md space-y-3">
          <UsageTracker usage={usage} />
          <div className="flex justify-center">
            <CreditBadge credits={usage.credits} />
          </div>
        </div>
      )}

      {error && (
        <p className="text-center text-sm text-red-300">{error}</p>
      )}

      <section>
        <h2 className="text-center text-2xl font-semibold">Subscription plans</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted">
          Pay with Paystack (GHS). Credits refill each billing period. Webhook
          activates your plan automatically.
        </p>
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
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
              disabled={!email}
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
        <article className="glass mx-auto max-w-lg rounded-2xl p-6">
          <h3 className="text-lg font-semibold">Free</h3>
          <p className="mt-2 text-3xl font-bold">{formatGhs(0)}</p>
          <ul className="mt-6 space-y-2 text-sm text-muted">
            {FREE_TIER_FEATURES.map((f) => (
              <li key={f}>• {f.replace("25", String(FREE_STARTER_CREDITS))}</li>
            ))}
          </ul>
          <ButtonLink href="/chat/login" variant="secondary" className="mt-6 w-full">
            Get started
          </ButtonLink>
        </article>
      </section>

      <section>
        <h2 className="text-center text-2xl font-semibold">Credit top-ups</h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted">
          One-time packs added to your balance (any plan).
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {CREDIT_PACKS.map((pack) => (
            <article
              key={pack.id}
              className={cn(
                "glass flex flex-col rounded-2xl p-6",
                pack.highlighted && "border-violet-500/40"
              )}
            >
              <h3 className="font-semibold">{pack.label}</h3>
              <p className="mt-2 text-2xl font-bold">{formatGhs(pack.amountGhs)}</p>
              <p className="mt-2 flex-1 text-sm text-muted">{pack.description}</p>
              <button
                type="button"
                disabled={!email || paying}
                onClick={() => void checkout(pack.id)}
                className="mt-6 rounded-xl bg-accent py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
              >
                Buy credits
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
