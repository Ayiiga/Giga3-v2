"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { SubscriptionCard } from "@/components/billing/SubscriptionCard";
import { UsageTracker } from "@/components/billing/UsageTracker";
import { ButtonLink } from "@/components/ui/Button";
import { useBilling } from "@/hooks/useBilling";
import {
  PLAN_FEATURE_HIGHLIGHTS,
  SUBSCRIPTION_PRODUCTS,
} from "@/lib/payments/plans";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function SubscribePageClientInner() {
  const router = useRouter();
  const { email, usage, paying, error, checkout } = useBilling();

  useEffect(() => {
    if (!email) router.replace("/chat/login?next=/subscribe");
  }, [email, router]);

  if (!email) {
    return <p className="text-center text-muted">Redirecting…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Choose your plan</h1>
        <p className="mt-2 text-muted">
          Monthly billing in <span className="text-foreground">GHS</span> via
          Paystack · Credits refill on renewal
        </p>
      </div>
      {usage && <UsageTracker usage={usage} />}
      {error && <p className="text-sm text-red-300">{error}</p>}
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
