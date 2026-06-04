"use client";

import type { CheckoutPhase } from "@/components/billing/CheckoutOverlay";
import { getUserEmail } from "@/lib/auth";
import type { UsageSnapshot } from "@/lib/credits/constants";
import { friendlyPaystackError } from "@/lib/payments/paystackErrors";
import {
  getPaystackPublicKeyFromBuild,
  paystackModeFromPublicKey,
  type PaystackClientMode,
} from "@/lib/payments/paystackConfig";
import {
  openPaystackCheckout,
  initializePaystackPayment,
  preloadPaystackInline,
  resetPaystackCheckoutGuard,
  verifyPaystackPayment,
} from "@/lib/payments/paystackService";
import { api } from "convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useBilling() {
  const router = useRouter();
  const email = getUserEmail();
  const userId = email ?? "";
  const [checkoutPhase, setCheckoutPhase] = useState<CheckoutPhase>(null);
  const [checkoutActive, setCheckoutActive] = useState(false);
  const [checkoutPreview, setCheckoutPreview] = useState<{
    label: string;
    amountGhs: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const checkoutLock = useRef(false);
  const lastProductId = useRef<string | null>(null);

  const paying = checkoutActive || checkoutPhase !== null;

  useEffect(() => {
    setMounted(true);
    preloadPaystackInline();
    return () => resetPaystackCheckoutGuard();
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
  const keysMismatch = paystackConfig?.enabled && paystackConfig.keyMismatch;

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

  const clearCheckout = useCallback(() => {
    setCheckoutPhase(null);
    setCheckoutActive(false);
    setCheckoutPreview(null);
    checkoutLock.current = false;
    resetPaystackCheckoutGuard();
  }, []);

  const checkout = useCallback(
    async (productId: string) => {
      if (!email) throw new Error("Sign in required");
      if (checkoutLock.current) return;

      if (keysMismatch) {
        setError(
          "Payment keys are misconfigured (live vs test). Contact support."
        );
        return;
      }

      checkoutLock.current = true;
      lastProductId.current = productId;
      setCheckoutActive(true);
      setError(null);
      setCheckoutPhase("preparing");

      try {
        const result = await initializePaystackPayment(initPayment, {
          userId: email,
          email,
          productId,
        });

        setCheckoutPreview({
          label: result.label,
          amountGhs: result.amountGhs,
        });
        setCheckoutPhase("opening");

        const mode = await openPaystackCheckout(result, {
          email,
          publicKey,
          onPopupReady: () => setCheckoutPhase(null),
          onSuccess: async (reference) => {
            setCheckoutPhase("verifying");
            try {
              await verifyPaystackPayment(verifyPayment, reference);
            } catch {
              /* Webhook may still fulfill; success page retries */
            }
            clearCheckout();
            router.push(
              `/payment/success/?reference=${encodeURIComponent(reference)}`
            );
          },
          onCancel: () => {
            clearCheckout();
          },
          onError: (message) => {
            clearCheckout();
            setError(friendlyPaystackError(message));
          },
        });

        if (mode === "redirect") {
          setCheckoutPhase("opening");
          return;
        }
      } catch (e) {
        clearCheckout();
        setError(friendlyPaystackError(e));
      }
    },
    [
      email,
      initPayment,
      publicKey,
      router,
      verifyPayment,
      keysMismatch,
      clearCheckout,
    ]
  );

  const verify = useCallback(
    async (reference: string) => {
      return verifyPaystackPayment(verifyPayment, reference);
    },
    [verifyPayment]
  );

  const dismissError = useCallback(() => setError(null), []);

  const retryLastCheckout = useCallback(() => {
    const id = lastProductId.current;
    if (!id) return;
    dismissError();
    void checkout(id);
  }, [checkout, dismissError]);

  return {
    email,
    usage,
    paying,
    checkoutPhase,
    checkoutPreview,
    error,
    checkout,
    verify,
    paystackMode,
    inlineEnabled,
    keysMismatch,
    clearCheckout,
    dismissError,
    retryLastCheckout,
  };
}
