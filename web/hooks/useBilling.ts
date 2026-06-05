"use client";

import type { CheckoutPhase } from "@/components/billing/CheckoutOverlay";
import { getUserEmail } from "@/lib/auth";
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
import { useProbedQuery } from "@/hooks/useProbedQuery";
import { useAction } from "convex/react";
import { useStableUsage } from "@/hooks/useStableUsage";
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

  const paying = checkoutActive || checkoutPhase !== null;

  useEffect(() => {
    setMounted(true);
    preloadPaystackInline();
    return () => resetPaystackCheckoutGuard();
  }, []);

  const paystackConfig = useProbedQuery(
    api.paystack.getClientConfig,
    mounted ? {} : "skip"
  );

  const usageRaw = useProbedQuery(
    api.credits.getUsageSnapshot,
    mounted && userId ? { userId } : "skip"
  );

  const initPayment = useAction(api.paystack.initializePayment);
  const verifyPayment = useAction(api.paystack.verifyPayment);
  const reconcilePayment = useAction(api.paystack.reconcilePayment);

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

  const usage = useStableUsage(
    usageRaw as Record<string, unknown> | null | undefined
  );

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

  const reconcile = useCallback(
    async (reference: string) => {
      return reconcilePayment({ reference });
    },
    [reconcilePayment]
  );

  const dismissError = useCallback(() => setError(null), []);

  return {
    email,
    usage,
    paying,
    checkoutPhase,
    checkoutPreview,
    error,
    checkout,
    verify,
    reconcile,
    paystackMode,
    inlineEnabled,
    keysMismatch,
    clearCheckout,
    dismissError,
  };
}
