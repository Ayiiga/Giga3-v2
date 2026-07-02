"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { CheckoutOverlay } from "@/components/billing/CheckoutOverlay";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useBilling } from "@/hooks/useBilling";
import { useVideoWallet } from "@/hooks/useVideoAI";
import { VIDEO_PACKS, VIDEO_SUBSCRIPTIONS } from "@/lib/video/catalog";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type VideoCatalogEntry = { id: string; amountGhs: number };

function VideoPlansInner() {
  const router = useRouter();
  const { mounted, sessionToken, wallet } = useVideoWallet();
  const { checkout, paying, checkoutPhase, checkoutPreview, error } = useBilling();

  useEffect(() => {
    if (mounted && !sessionToken) {
      router.replace("/chat/login?next=/video/plans");
    }
  }, [mounted, sessionToken, router]);

  if (!mounted || !sessionToken) {
    return <p className="text-center text-muted">Redirecting…</p>;
  }

  const catalog = wallet?.catalog;

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <CheckoutOverlay
        phase={checkoutPhase}
        label={checkoutPreview?.label}
        amountGhs={checkoutPreview?.amountGhs}
      />
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
            const live = catalog?.subscriptions.find(
              (s: VideoCatalogEntry) => s.id === plan.id
            );
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
                  onClick={() => void checkout(plan.id)}
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
            const live = catalog?.packs.find(
              (p: VideoCatalogEntry) => p.id === pack.id
            );
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
                  onClick={() => void checkout(pack.id)}
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
