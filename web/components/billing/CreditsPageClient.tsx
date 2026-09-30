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
import { PayMethodPicker } from "@/components/billing/PayMethodPicker";
import type { PayMethod } from "@/lib/billing/paystackPacks";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

  const [payMethod, setPayMethod] = useState<PayMethod>("momo");

  const microPacks = useMemo(
    () => CREDIT_PACKS.filter((pack) => pack.amountGhs <= 20).sort((a, b) => a.amountGhs - b.amountGhs),
    []
  );
  const standardPacks = useMemo(
    () => CREDIT_PACKS.filter((pack) => pack.amountGhs > 20),
    []
  );

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
          Images cost {CREDIT_COSTS.image} credits · Videos from {CREDIT_COSTS.video}{" "}
          credits (5s) — 10s = 20, 15s = 30. Payments in GHS via Paystack.
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

      <section className="space-y-4 rounded-2xl border border-accent/25 bg-accent/5 p-4 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Quick Paystack top-ups</h2>
          <p className="mt-1 text-sm text-muted">
            1 GHS = 1 credit · GH₵5, GH₵10, and GH₵20 packs — not subscriptions. Tap a pack, then
            pay with MTN MoMo via Paystack.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {microPacks.map((pack) => (
            <article
              key={pack.id}
              className={cn(
                "flex flex-col rounded-xl border bg-white p-4 shadow-sm",
                pack.highlighted ? "border-violet-500/50 ring-1 ring-violet-500/20" : "border-border"
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                {formatGhs(pack.amountGhs)}
              </p>
              <h3 className="mt-1 text-base font-semibold text-foreground">{pack.label}</h3>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {pack.credits} credits
              </p>
              <p className="mt-2 flex-1 text-sm text-muted">{pack.description}</p>
              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={paying}
                onClick={() => void checkout(pack.id, payMethod)}
                className="mt-4 w-full"
              >
                {paystackButtonLabel(
                  checkoutPhase,
                  `Pay ${formatGhs(pack.amountGhs)} via Paystack`
                )}
              </Button>
            </article>
          ))}
        </div>
      </section>

      <PayMethodPicker value={payMethod} onChange={setPayMethod} disabled={paying} />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Larger top-ups</h2>
        <p className="text-sm text-muted">Need more credits? One-time packs via Paystack.</p>
        <div className="grid gap-8 md:grid-cols-3">
          {standardPacks.map((pack) => (
            <article
              key={pack.id}
              className={cn(
                "glass flex flex-col rounded-2xl p-8",
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
                disabled={paying}
                onClick={() => void checkout(pack.id, payMethod)}
                className="mt-8 w-full"
              >
                {paystackButtonLabel(checkoutPhase, "Pay with Paystack")}
              </Button>
            </article>
          ))}
        </div>
      </section>
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
