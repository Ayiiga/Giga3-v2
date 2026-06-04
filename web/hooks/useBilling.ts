"use client";

import { getUserEmail } from "@/lib/auth";
import type { UsageSnapshot } from "@/lib/credits/constants";
import {
  getPaystackPublicKeyFromBuild,
  paystackModeFromPublicKey,
  type PaystackClientMode,
} from "@/lib/payments/paystackConfig";
import {
  openPaystackCheckout,
  initializePaystackPayment,
  verifyPaystackPayment,
} from "@/lib/payments/paystackService";
import { api } from "convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export function useBilling() {
  const router = useRouter();
  const email = getUserEmail();
  const userId = email ?? "";
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const paystackConfig = useQuery(
    api.paystack.getClientConfig,
    mounted ? {} : "skip"
  );

  const usageRaw = useQuery(
    api.credits.getUsageSnapshot,
    mounted && userId ? { userId } : "skip"
  );

  const initPayment = useAction(api.paystack.initializePayment);
  const verifyPayment = useAction(api.paystack.verifyPayment);

  const publicKey = useMemo(() => {
    const fromBuild = getPaystackPublicKeyFromBuild();
    if (fromBuild) return fromBuild;
    if (paystackConfig?.enabled) return paystackConfig.publicKey;
    return undefined;
  }, [paystackConfig]);

  const paystackMode: PaystackClientMode | null = useMemo(() => {
    if (publicKey) return paystackModeFromPublicKey(publicKey);
    if (paystackConfig?.enabled) return paystackConfig.mode;
    return null;
  }, [publicKey, paystackConfig]);

  const inlineEnabled = Boolean(publicKey) || Boolean(paystackConfig?.enabled);

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

        const mode = await openPaystackCheckout(result, {
          email,
          publicKey,
          onSuccess: async (reference) => {
            try {
              await verifyPaystackPayment(verifyPayment, reference);
              router.push(
                `/payment/success/?reference=${encodeURIComponent(reference)}`
              );
            } catch {
              router.push(
                `/payment/success/?reference=${encodeURIComponent(reference)}`
              );
            } finally {
              setPaying(false);
            }
          },
          onCancel: () => setPaying(false),
          onError: (message) => {
            setError(message);
            setPaying(false);
          },
        });

        if (mode === "redirect") {
          return;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Payment failed");
        setPaying(false);
      }
    },
    [email, initPayment, publicKey, router, verifyPayment]
  );

  const verify = useCallback(
    async (reference: string) => {
      return verifyPaystackPayment(verifyPayment, reference);
    },
    [verifyPayment]
  );

  return {
    email,
    usage,
    paying,
    error,
    checkout,
    verify,
    paystackMode,
    inlineEnabled,
  };
}
