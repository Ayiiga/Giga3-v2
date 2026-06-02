"use client";

import { CreditBadge } from "@/components/billing/CreditBadge";
import { UsageTracker } from "@/components/billing/UsageTracker";
import { ButtonLink } from "@/components/ui/Button";
import { useBilling } from "@/hooks/useBilling";
import { CREDIT_PACKS, formatGhs } from "@/lib/payments/plans";
import { CREDITS_PER_IMAGE, CREDITS_PER_VIDEO } from "@/lib/credits/constants";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function CreditsPageClient() {
  const router = useRouter();
  const { email, usage, paying, error, checkout } = useBilling();

  useEffect(() => {
    if (!email) router.replace("/chat/login?next=/credits");
  }, [email, router]);

  if (!email) {
    return <p className="text-center text-muted">Redirecting…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Buy credits</h1>
        <p className="mt-2 text-muted">
          Images cost {CREDITS_PER_IMAGE} credits · Videos cost {CREDITS_PER_VIDEO}{" "}
          credits (Premium). Payments in GHS via Paystack.
        </p>
        {usage && (
          <div className="mt-4 flex justify-center">
            <CreditBadge credits={usage.credits} />
          </div>
        )}
      </div>
      {usage && <UsageTracker usage={usage} />}
      {error && <p className="text-sm text-red-300">{error}</p>}
      <div className="grid gap-6 md:grid-cols-3">
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
              disabled={paying}
              onClick={() => void checkout(pack.id)}
              className="mt-6 rounded-xl bg-accent py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
            >
              Pay with Paystack
            </button>
          </article>
        ))}
      </div>
      {!usage?.premium && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-4 text-sm text-amber-100">
          Video generation requires{" "}
          <Link href="/subscribe" className="underline">
            Premium
          </Link>
          . Free users get 5 images per day without credits.
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
