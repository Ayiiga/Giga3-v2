"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { CheckoutOverlay } from "@/components/billing/CheckoutOverlay";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useVideoWallet } from "@/hooks/useVideoAI";
import { friendlyPaystackError } from "@/lib/payments/paystackErrors";
import {
  openPaystackCheckout,
  verifyPaystackPayment,
} from "@/lib/payments/paystackService";
import { getPaystackPublicKeyFromBuild } from "@/lib/payments/paystackConfig";
import { VIDEO_PACKS, VIDEO_SUBSCRIPTIONS } from "@/lib/video/catalog";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function VideoPlansInner() {
  const router = useRouter();
  const { mounted, sessionToken, wallet, purchaseProduct } = useVideoWallet();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mounted && !sessionToken) {
      router.replace("/chat/login?next=/video/plans");
    }
  }, [mounted, sessionToken, router]);

  async function checkout(productId: string, label: string) {
    setPaying(true);
    setError(null);
    try {
      const init = await purchaseProduct(productId);
      const publicKey = getPaystackPublicKeyFromBuild();
      if (!publicKey) throw new Error("Paystack is not configured");
      await openPaystackCheckout({
        publicKey,
        email: "",
        amount: init.amountGhs * 100,
        reference: init.reference,
        accessCode: init.accessCode,
      });
      await verifyPaystackPayment(init.reference);
      router.push(`/payment/success/?reference=${encodeURIComponent(init.reference)}`);
    } catch (err) {
      setError(friendlyPaystackError(err));
    } finally {
      setPaying(false);
    }
  }

  if (!mounted || !sessionToken) {
    return <p className="text-center text-muted">Redirecting…</p>;
  }

  const catalog = wallet?.catalog;

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <CheckoutOverlay phase={paying ? "processing" : null} />
      <div className="text-center">
        <h1 className="page-title">Video AI Plans</h1>
        <p className="mt-2 text-muted">
          Independent video subscriptions and credit packs (~$15–$300). Never mixed with chat credits.
        </p>
        <p className="mt-3 text-sm">
          Balance: <strong>{wallet?.videoCredits ?? 0}</strong> video credits
        </p>
      </div>
      {error && (
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-center text-sm text-red-700">{error}</p>
      )}

      <section>
        <h2 className="mb-4 text-xl font-semibold">Monthly subscriptions</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {VIDEO_SUBSCRIPTIONS.map((plan) => {
            const live = catalog?.subscriptions.find((s) => s.id === plan.id);
            return (
              <article
                key={plan.id}
                className={cn(
                  "flex flex-col rounded-2xl border bg-card p-6",
                  plan.highlighted && "border-violet-500/40"
                )}
              >
                <h3 className="font-semibold">{plan.label}</h3>
                <p className="mt-1 text-2xl font-bold">
                  ${plan.usdPrice}
                  <span className="text-sm font-normal text-muted"> / mo</span>
                </p>
                {live && (
                  <p className="text-sm text-muted">≈ GHS {live.amountGhs.toLocaleString()}</p>
                )}
                <p className="mt-3 flex-1 text-sm text-muted">{plan.description}</p>
                <p className="mt-2 text-sm font-medium">{plan.videoCredits} video credits / month</p>
                <Button
                  className="mt-4 w-full"
                  disabled={paying}
                  onClick={() => checkout(plan.id, plan.label)}
                >
                  Subscribe
                </Button>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">One-time credit packs</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VIDEO_PACKS.map((pack) => {
            const live = catalog?.packs.find((p) => p.id === pack.id);
            return (
              <article key={pack.id} className="flex flex-col rounded-2xl border bg-card p-6">
                <h3 className="font-semibold">{pack.label}</h3>
                <p className="mt-1 text-2xl font-bold">${pack.usdPrice}</p>
                {live && <p className="text-sm text-muted">≈ GHS {live.amountGhs.toLocaleString()}</p>}
                <p className="mt-3 flex-1 text-sm text-muted">
                  {pack.videoCredits} credits · {pack.expiryDays} day validity
                </p>
                <Button
                  className="mt-4 w-full"
                  variant="secondary"
                  disabled={paying}
                  onClick={() => checkout(pack.id, pack.label)}
                >
                  Buy pack
                </Button>
              </article>
            );
          })}
        </div>
      </section>

      <div className="text-center">
        <ButtonLink href="/video" variant="ghost">
          Back to Video AI Studio
        </ButtonLink>
      </div>
    </div>
  );
}

export function VideoPlansClient() {
  return (
    <ConvexAppShell>
      <VideoPlansInner />
    </ConvexAppShell>
  );
}
