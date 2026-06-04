"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { SubscriptionCard } from "@/components/billing/SubscriptionCard";
import { UsageTracker } from "@/components/billing/UsageTracker";
import { ButtonLink } from "@/components/ui/Button";
import { BillingErrorBanner } from "@/components/billing/BillingErrorBanner";
import { CheckoutOverlay } from "@/components/billing/CheckoutOverlay";
import { PaystackModeBadge } from "@/components/billing/PaystackModeBadge";
import { useBilling } from "@/hooks/useBilling";
import { paystackButtonLabel } from "@/lib/payments/checkoutLabels";
import {
  PLAN_FEATURE_HIGHLIGHTS,
  SUBSCRIPTION_PRODUCTS,
} from "@/lib/payments/plans";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function SubscribePageClientInner() {
  const router = useRouter();
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
    if (!email) router.replace("/chat/login?next=/subscribe");
  }, [email, router]);

  if (!email) {
    return <p className="text-center text-muted">Redirecting…</p>;
  }

  return (
    <div className="space-y-8">
      <CheckoutOverlay
        phase={checkoutPhase}
        label={checkoutPreview?.label}
        amountGhs={checkoutPreview?.amountGhs}
      />
      <div className="text-center">
        <h1 className="text-3xl font-bold">Choose your plan</h1>
        <p className="mt-2 text-muted">
          Monthly billing in <span className="text-foreground">GHS</span> via
          Paystack · Credits refill on renewal
        </p>
        <div className="mt-3 flex justify-center">
          <PaystackModeBadge mode={paystackMode} inlineEnabled={inlineEnabled} />
        </div>
      </div>
      {usage && <UsageTracker usage={usage} />}
      {error && (
        <BillingErrorBanner message={error} onDismiss={dismissError} />
      )}
      <div className="grid gap-6 md:grid-cols-3">
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
            disabled={paying}
          />
        ))}
      </div>
      <p className="text-center text-xs text-muted">
        <Link href="/pricing" className="text-accent hover:underline">
          Full pricing & credit packs
        </Link>
        {" · "}
        <ButtonLink href="/credits" variant="ghost" size="sm">
          Buy credits only
        </ButtonLink>
      </p>
    </div>
  );
}

export function SubscribePageClient() {
  return (
    <ConvexAppShell>
      <SubscribePageClientInner />
    </ConvexAppShell>
  );
}
