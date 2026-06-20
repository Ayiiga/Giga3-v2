"use client";

import type { CheckoutPhase } from "@/components/billing/CheckoutOverlay";
import { getUserEmail } from "@/lib/auth";
import { isSupabaseDataBackend } from "@/lib/dataBackend";
import { friendlyPaystackError } from "@/lib/payments/paystackErrors";
import {
  getPaystackPublicKeyFromBuild,
  paystackModeFromPublicKey,
  type PaystackClientMode,
} from "@/lib/payments/paystackConfig";
import { getProductById } from "@/lib/payments/plans";
import {
  openPaystackCheckout,
  initializePaystackPayment,
  preloadPaystackInline,
  resetPaystackCheckoutGuard,
  verifyPaystackPayment,
} from "@/lib/payments/paystackService";
import { api } from "@/lib/convexApi";
import {
  getSupabasePaymentByReference,
  upsertSupabasePayment,
} from "@/lib/supabase/data";
import { useAction, useQuery } from "convex/react";
import { useStableUsage } from "@/hooks/useStableUsage";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function isSuccessfulPaymentResult(
  value: unknown
): value is { status?: string; alreadyFulfilled?: boolean } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { status?: string; alreadyFulfilled?: boolean };
  return candidate.status === "success" || Boolean(candidate.alreadyFulfilled);
}

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

  const mirrorSupabasePayment = useCallback(
    async (args: {
      reference: string;
      status: "pending" | "success" | "failed";
      productId?: string;
      amountGhs?: number;
      providerResponse?: Record<string, unknown>;
    }) => {
      if (!email || !isSupabaseDataBackend()) return;

      try {
        const existing = args.productId
          ? null
          : await getSupabasePaymentByReference(email, args.reference);
        const productId = args.productId ?? existing?.product_id ?? undefined;
        if (!productId) return;

        const product = getProductById(productId);
        const inferredType =
          product?.type ??
          existing?.type ??
          (productId.startsWith("sub_") ? "subscription" : "credits");

        await upsertSupabasePayment({
          email,
          provider: "paystack",
          reference: args.reference,
          productId,
          type: inferredType,
          amountGhs:
            args.amountGhs ?? product?.amountGhs ?? existing?.amount_ghs ?? null,
          planId: (product?.planId ?? existing?.plan_id ?? null) as
            | "free"
            | "basic"
            | "pro"
            | "premium"
            | null,
          creditsGranted:
            product?.credits ?? existing?.credits_granted ?? null,
          status: args.status,
          providerResponse: (args.providerResponse ?? null) as any,
        });
      } catch (err) {
        console.warn("[billing] Supabase payment mirror failed:", err);
      }
    },
    [email]
  );

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
      let pendingReference: string | null = null;

      try {
        const result = await initializePaystackPayment(initPayment, {
          userId: email,
          email,
          productId,
        });
        pendingReference = result.reference;

        await mirrorSupabasePayment({
          reference: result.reference,
          productId,
          amountGhs: result.amountGhs,
          status: "pending",
          providerResponse: {
            phase: "initialized",
          },
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
            let verified = false;
            try {
              await verifyPaystackPayment(verifyPayment, reference);
              verified = true;
            } catch {
              /* Webhook may still fulfill; success page retries */
            }
            await mirrorSupabasePayment({
              reference,
              productId,
              amountGhs: result.amountGhs,
              status: verified ? "success" : "pending",
              providerResponse: {
                phase: "popup_success",
                verified,
              },
            });
            clearCheckout();
            router.push(
              `/payment/success/?reference=${encodeURIComponent(reference)}`
            );
          },
          onCancel: () => {
            void mirrorSupabasePayment({
              reference: result.reference,
              productId,
              amountGhs: result.amountGhs,
              status: "failed",
              providerResponse: {
                phase: "popup_cancel",
              },
            });
            clearCheckout();
          },
          onError: (message) => {
            void mirrorSupabasePayment({
              reference: result.reference,
              productId,
              amountGhs: result.amountGhs,
              status: "failed",
              providerResponse: {
                phase: "popup_error",
                message,
              },
            });
            clearCheckout();
            setError(friendlyPaystackError(message));
          },
        });

        if (mode === "redirect") {
          setCheckoutPhase("opening");
          return;
        }
      } catch (e) {
        if (pendingReference) {
          void mirrorSupabasePayment({
            reference: pendingReference,
            productId,
            status: "failed",
            providerResponse: {
              phase: "checkout_exception",
              error: e instanceof Error ? e.message : String(e),
            },
          });
        }
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
      mirrorSupabasePayment,
    ]
  );

  const verify = useCallback(
    async (reference: string) => {
      try {
        const result = await verifyPaystackPayment(verifyPayment, reference);
        await mirrorSupabasePayment({
          reference,
          status: isSuccessfulPaymentResult(result) ? "success" : "pending",
          providerResponse: {
            phase: "verify_action",
          },
        });
        return result;
      } catch (err) {
        await mirrorSupabasePayment({
          reference,
          status: "pending",
          providerResponse: {
            phase: "verify_action_error",
            error: err instanceof Error ? err.message : String(err),
          },
        });
        throw err;
      }
    },
    [verifyPayment, mirrorSupabasePayment]
  );

  const reconcile = useCallback(
    async (reference: string) => {
      try {
        const result = await reconcilePayment({ reference });
        await mirrorSupabasePayment({
          reference,
          status: isSuccessfulPaymentResult(result) ? "success" : "pending",
          providerResponse: {
            phase: "reconcile_action",
          },
        });
        return result;
      } catch (err) {
        await mirrorSupabasePayment({
          reference,
          status: "pending",
          providerResponse: {
            phase: "reconcile_action_error",
            error: err instanceof Error ? err.message : String(err),
          },
        });
        throw err;
      }
    },
    [reconcilePayment, mirrorSupabasePayment]
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
