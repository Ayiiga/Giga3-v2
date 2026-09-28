"use client";

import { useBilling } from "@/hooks/useBilling";
import { getSessionToken } from "@/lib/auth";
import {
  DEFAULT_MODAL_PACK_ID,
  PAY_METHODS,
  PAYSTACK_MODAL_PACKS,
  channelsForPayMethod,
  getModalPack,
  type ModalPackId,
  type PayMethod,
} from "@/lib/billing/paystackPacks";
import { friendlyPaystackError } from "@/lib/payments/paystackErrors";
import { getPaystackPublicKeyFromBuild } from "@/lib/payments/paystackConfig";
import {
  initializePaystackPayment,
  openPaystackCheckout,
  verifyPaystackPayment,
} from "@/lib/payments/paystackService";
import { cn } from "@/lib/utils";
import { useAction } from "convex/react";
import Link from "next/link";
import { memo, useState } from "react";
import { api } from "convex/_generated/api";

interface CreditsPaystackModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCredits: number | null;
  onSuccess: (addedCredits: number) => void;
}

type ModalState =
  | { kind: "idle" }
  | { kind: "paying"; label: string }
  | { kind: "success"; added: number; reference: string }
  | { kind: "error"; message: string };

/**
 * Credits purchase bottom sheet — real Paystack checkout (MoMo / Card / Bank)
 * through the server-side `paystack:initializePayment` action. No new libs,
 * no API routes, amounts verified server-side from the product catalog.
 */
export const CreditsPaystackModal = memo(function CreditsPaystackModal({
  isOpen,
  onClose,
  currentCredits,
  onSuccess,
}: CreditsPaystackModalProps) {
  const { email } = useBilling();
  const initPayment = useAction(api.paystack.initializePayment);
  const verifyPayment = useAction(api.paystack.verifyPayment);

  const [selectedPack, setSelectedPack] = useState<ModalPackId>(DEFAULT_MODAL_PACK_ID);
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>("momo");
  const [state, setState] = useState<ModalState>({ kind: "idle" });

  if (!isOpen) return null;

  const pack = getModalPack(selectedPack);
  const paying = state.kind === "paying";
  const methodLabel = PAY_METHODS.find((m) => m.id === paymentMethod)?.label ?? paymentMethod;

  async function handlePay() {
    if (!pack.productId || paying) return;
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      setState({ kind: "error", message: "Sign in required to buy credits." });
      return;
    }
    if (!email) {
      setState({ kind: "error", message: "A valid email is required for checkout." });
      return;
    }
    setState({ kind: "paying", label: `Opening Paystack for ${pack.name}…` });
    try {
      const channels = channelsForPayMethod(paymentMethod);
      const init = await initializePaystackPayment(initPayment, {
        sessionToken,
        productId: pack.productId,
        channels,
      });
      await openPaystackCheckout(init, {
        email,
        publicKey: getPaystackPublicKeyFromBuild(),
        channels,
        onPopupReady: () =>
          setState({ kind: "paying", label: "Paystack open — complete payment…" }),
        onSuccess: async (reference) => {
          setState({ kind: "paying", label: "Verifying payment…" });
          try {
            await verifyPaystackPayment(verifyPayment, reference, sessionToken);
            setState({ kind: "success", added: pack.credits, reference });
          } catch (verifyErr) {
            setState({
              kind: "error",
              message: `${friendlyPaystackError(verifyErr)} Reference: ${reference}`,
            });
          }
        },
        onCancel: () =>
          setState({ kind: "error", message: "Payment cancelled. No charge was made — try again." }),
        onError: (message) =>
          setState({ kind: "error", message: friendlyPaystackError(message) }),
      });
    } catch (err) {
      setState({ kind: "error", message: friendlyPaystackError(err) });
    }
  }

  function handleDone() {
    if (state.kind === "success") onSuccess(state.added);
    setState({ kind: "idle" });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Buy credits">
      <button
        type="button"
        className="absolute inset-0 z-10 bg-black/50"
        aria-label="Close buy credits"
        onClick={onClose}
      />
      <div className="absolute bottom-0 left-0 right-0 z-20 mx-auto flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] bg-white shadow-2xl">
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[#E5E7EB]" aria-hidden />

        <div className="flex items-center justify-between gap-2 border-b border-[#E5E7EB] p-4">
          <div>
            <p className="text-[18px] font-bold text-black">
              Buy Credits <span aria-hidden>🇬🇭</span>
            </p>
            <p className="text-[11px] text-gray-500">
              Paystack · GHS · Selected: {pack.name} {pack.credits}cr{" "}
              <span className="font-semibold text-[#10B981]">✓</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F4F6] text-gray-500"
          >
            ✕
          </button>
        </div>

        {state.kind === "success" ? (
          <div className="flex flex-col items-center gap-2 overflow-y-auto p-6 text-center">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#10B981] text-3xl text-white" aria-hidden>
              ✓
            </span>
            <p className="text-[18px] font-bold text-black">Payment successful!</p>
            <p className="text-sm text-gray-500">{state.added} credits added</p>
            <p className="text-sm text-gray-500">
              New balance{" "}
              {currentCredits != null ? `${currentCredits + state.added}` : "updating…"}
            </p>
            <Link
              href={`/payment/success/?reference=${encodeURIComponent(state.reference)}`}
              className="text-xs text-gray-500 underline"
            >
              View receipt
            </Link>
            <button
              type="button"
              onClick={handleDone}
              className="mt-2 min-h-12 w-full rounded-full bg-[#EAB308] p-3 text-base font-bold text-black"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {PAYSTACK_MODAL_PACKS.map((p) => {
                const selected = p.id === selectedPack;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPack(p.id);
                      setState({ kind: "idle" });
                    }}
                    aria-pressed={selected}
                    className={cn(
                      "relative w-full rounded-2xl border-2 p-4 text-left",
                      p.popular
                        ? "border-[#EAB308] bg-[#FEF3C7]"
                        : selected
                          ? "border-[#7C3AED] bg-white"
                          : "border-[#E5E7EB] bg-white"
                    )}
                  >
                    {p.badge ? (
                      <span
                        className={cn(
                          "absolute right-3 top-3 rounded-full px-2 py-1 text-[10px] font-bold",
                          p.popular ? "bg-[#EAB308] text-black" : "bg-[#F3F4F6] text-gray-500"
                        )}
                      >
                        {p.badge}
                      </span>
                    ) : null}
                    <span className="flex items-start justify-between gap-2 pr-20">
                      <span>
                        <span className="block text-base font-bold text-black">
                          {p.name} · {p.credits}cr
                        </span>
                        <span className="mt-0.5 block text-[11px] text-gray-500">{p.subtitle}</span>
                        {selected ? (
                          <span className="mt-1 block text-xs font-bold text-[#10B981]">
                            Selected! ✓
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-base font-bold text-black">
                          {p.priceGhs === 0 ? "Free" : `GH₵${p.priceGhs}`}
                        </span>
                        {p.recurring ? (
                          <span className="block text-[11px] text-gray-500">/month</span>
                        ) : null}
                      </span>
                    </span>
                    {selected ? (
                      <span
                        className="absolute bottom-3 right-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#7C3AED] text-xs text-white"
                        aria-hidden
                      >
                        ✓
                      </span>
                    ) : null}
                  </button>
                );
              })}

              <div className="rounded-2xl border-t border-[#E5E7EB] bg-[#F9FAFB] p-3">
                <p className="text-xs font-bold text-black">
                  Pay with Paystack <span className="font-normal text-gray-500">· MoMo · Cards · Bank</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Payment method">
                  {PAY_METHODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      aria-pressed={paymentMethod === m.id}
                      title={m.detail}
                      onClick={() => setPaymentMethod(m.id)}
                      className={cn(
                        "min-h-11 rounded-full border px-3 py-1 text-xs",
                        paymentMethod === m.id
                          ? "border-[#EAB308] bg-[#EAB308] font-bold text-black"
                          : "border-[#E5E7EB] bg-white text-gray-500"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  Paying with: <span className="font-semibold text-[#10B981]">{methodLabel} ✓</span>
                </p>
              </div>

              <div className="space-y-1 rounded-2xl border border-[#E5E7EB] p-3 text-sm">
                <p className="flex justify-between text-black">
                  <span>Subtotal</span>
                  <span className="font-bold">
                    {pack.priceGhs === 0 ? "Free" : `GH₵${pack.priceGhs}`}
                  </span>
                </p>
                <p className="flex justify-between text-black">
                  <span>Credits</span>
                  <span className="font-bold">{pack.credits}</span>
                </p>
                <p className="flex justify-between text-xs text-gray-500">
                  <span>Validity</span>
                  <span>{pack.recurring ? "30 days · renews monthly" : "One-time · never expires"}</span>
                </p>
                <p className="flex items-center justify-between gap-2 text-xs text-gray-500">
                  <span>
                    Auto-renew{" "}
                    <span className={cn("font-bold", pack.recurring ? "text-[#10B981]" : "text-gray-400")}>
                      {pack.recurring ? "ON" : "OFF"}
                    </span>
                  </span>
                  {pack.recurring ? (
                    <Link href="/subscribe" className="underline">
                      Manage in Subscription
                    </Link>
                  ) : (
                    <span>Top-ups do not renew</span>
                  )}
                </p>
              </div>

              {state.kind === "error" ? (
                <div role="alert" className="flex items-start gap-2 rounded-2xl border border-[#EF4444]/40 bg-red-50 p-3">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EF4444] text-xs text-white" aria-hidden>
                    ✕
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-black">Payment failed</p>
                    <p className="text-xs text-gray-600">{state.message}</p>
                    <button
                      type="button"
                      onClick={() => setState({ kind: "idle" })}
                      className="mt-1 min-h-11 rounded-full border border-[#E5E7EB] px-4 py-1 text-xs font-bold text-black"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="sticky bottom-0 border-t border-[#E5E7EB] bg-white p-4">
              {pack.productId ? (
                <>
                  <button
                    type="button"
                    onClick={() => void handlePay()}
                    disabled={paying}
                    className="min-h-12 w-full rounded-full bg-[#0AA72A] p-3 text-base font-bold text-white disabled:opacity-60"
                  >
                    {paying ? state.label : `Pay GH₵${pack.priceGhs} with Paystack`}
                  </button>
                  <p className="mt-1.5 text-center text-[10px] text-gray-500">
                    🔒 Secure by Paystack · Non-refundable once credits are granted · Failover billing active
                  </p>
                </>
              ) : (
                <p className="rounded-2xl bg-[#F9FAFB] p-3 text-center text-xs text-gray-500">
                  Free 25 starter credits are included with every account — no payment needed.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
});
