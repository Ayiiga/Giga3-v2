"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { CreditBadge } from "@/components/billing/CreditBadge";
import { UsageTracker } from "@/components/billing/UsageTracker";
import { Button, ButtonLink } from "@/components/ui/Button";
import { BillingErrorBanner } from "@/components/billing/BillingErrorBanner";
import { CheckoutOverlay } from "@/components/billing/CheckoutOverlay";
import { PaystackModeBadge } from "@/components/billing/PaystackModeBadge";
import { useBilling } from "@/hooks/useBilling";
import { paystackButtonLabel } from "@/lib/payments/checkoutLabels";
import { CREDIT_COSTS } from "@/lib/credits/constants";
import { CREDIT_PACKS, formatGhs } from "@/lib/payments/plans";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function CreditsPageClientInner() {
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
    if (!email) router.replace("/chat/login?next=/credits");
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
        <h1 className="page-title">Buy credits</h1>
        <p className="mt-2 text-lg font-medium text-foreground">
          Images cost {CREDIT_COSTS.image} credits · Videos cost{" "}
          {CREDIT_COSTS.video} credits. Payments in GHS via Paystack.
        </p>
        <div className="mt-3 flex justify-center">
          <PaystackModeBadge mode={paystackMode} inlineEnabled={inlineEnabled} />
        </div>
        {usage && (
          <div className="mt-4 flex justify-center">
            <CreditBadge credits={usage.credits} />
          </div>
        )}
      </div>
      {usage && <UsageTracker usage={usage} />}
      {error && (
        <BillingErrorBanner message={error} onDismiss={dismissError} />
      )}
      <div className="grid gap-8 md:grid-cols-3">
        {CREDIT_PACKS.map((pack) => (
          <article
            key={pack.id}
            className={cn(
              "glass flex flex-col rounded-2xl p-8",
              pack.highlighted && "border-accent/30"
            )}
          >
            <h3 className="font-semibold">{pack.label}</h3>
            <p className="mt-2 text-2xl font-bold">{formatGhs(pack.amountGhs)}</p>
            <p className="mt-2 flex-1 text-sm text-muted">{pack.description}</p>
            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={paying}
              onClick={() => void checkout(pack.id)}
              className="mt-8 w-full"
            >
              {paystackButtonLabel(checkoutPhase, "Pay with Paystack")}
            </Button>
          </article>
        ))}
      </div>
      {usage && !usage.canGenerateVideo && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-4 text-sm text-amber-100">
          Need more credits for video?{" "}
          <Link href="/subscribe" className="underline">
            Subscribe
          </Link>{" "}
          or buy a larger credit pack.
        </p>
      )}
      <p className="text-center">
        <ButtonLink href="/media" variant="secondary">
          Open media studio
        </ButtonLink>
      </p>
    </div>
  );
}

export function CreditsPageClient() {
  return (
    <ConvexAppShell>
      <CreditsPageClientInner />
    </ConvexAppShell>
  );
}
