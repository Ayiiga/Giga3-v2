"use client";

import { getUserEmail } from "@/lib/auth";
import type { UsageSnapshot } from "@/lib/credits/constants";
import {
  redirectToPaystack,
  initializePaystackPayment,
  verifyPaystackPayment,
} from "@/lib/payments/paystackService";
import { api } from "../../convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { useCallback, useState } from "react";

export function useBilling() {
  const email = getUserEmail();
  const userId = email ?? "";
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usageRaw = useQuery(
    api.credits.getUsageSnapshot,
    userId ? { userId } : "skip"
  );

  const initPayment = useAction(api.paystack.initializePayment);
  const verifyPayment = useAction(api.paystack.verifyPayment);

  const usage: UsageSnapshot | null = usageRaw
    ? {
        subscriptionPlan:
          (usageRaw.subscriptionPlan as UsageSnapshot["subscriptionPlan"]) ??
          "free",
        subscriptionActive: usageRaw.subscriptionActive,
        credits: usageRaw.credits,
        tokens: usageRaw.tokens,
        subscriptionExpiresAt: usageRaw.subscriptionExpiresAt,
        planLabel: String(usageRaw.planLabel),
        canGenerateVideo: usageRaw.canGenerateVideo,
        creditCosts: usageRaw.creditCosts,
      }
    : null;

  const checkout = useCallback(
    async (productId: string) => {
      if (!email) throw new Error("Sign in required");
      setPaying(true);
      setError(null);
      try {
        const result = await initializePaystackPayment(initPayment, {
          userId: email,
          email,
          productId,
        });
        redirectToPaystack(result.authorizationUrl);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Payment failed");
        setPaying(false);
      }
    },
    [email, initPayment]
  );

  const verify = useCallback(
    async (reference: string) => {
      return verifyPaystackPayment(verifyPayment, reference);
    },
    [verifyPayment]
  );

  return { email, usage, paying, error, checkout, verify };
}
