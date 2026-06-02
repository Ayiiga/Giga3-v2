"use client";

import { SubscriptionCard } from "@/components/billing/SubscriptionCard";
import { UsageTracker } from "@/components/billing/UsageTracker";
import { ButtonLink } from "@/components/ui/Button";
import { useBilling } from "@/hooks/useBilling";
import {
  PREMIUM_TIER_FEATURES,
  SUBSCRIPTION_PRODUCTS,
} from "@/lib/payments/plans";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function SubscribePageClient() {
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
        <h1 className="text-3xl font-bold">Go Premium</h1>
        <p className="mt-2 text-muted">
          Unlimited chats · Credit-based media · Billed in{" "}
          <span className="text-foreground">GHS</span> via Paystack
        </p>
      </div>
      {usage && <UsageTracker usage={usage} />}
      {error && <p className="text-sm text-red-300">{error}</p>}
      <SubscriptionCard
        product={SUBSCRIPTION_PRODUCTS[0]}
        features={PREMIUM_TIER_FEATURES}
        onSelect={(id) => void checkout(id)}
        loading={paying}
      />
      <p className="text-center text-xs text-muted">
        <Link href="/pricing" className="text-accent hover:underline">
          Compare all plans
        </Link>
        {" · "}
        <ButtonLink href="/credits" variant="ghost" size="sm">
          Buy credits only
        </ButtonLink>
      </p>
    </div>
  );
}
