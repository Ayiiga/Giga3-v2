"use client";

import { formatGhs } from "@/lib/payments/plans";
import { cn } from "@/lib/utils";
import { Loader2, ShieldCheck } from "lucide-react";

export type CheckoutPhase =
  | "preparing"
  | "opening"
  | "popup"
  | "verifying"
  | null;

interface CheckoutOverlayProps {
  phase: CheckoutPhase;
  label?: string;
  amountGhs?: number;
}

const PHASE_COPY: Record<Exclude<CheckoutPhase, null>, string> = {
  preparing: "Preparing secure checkout…",
  opening: "Opening Paystack…",
  popup: "Complete payment in the Paystack window",
  verifying: "Confirming your payment…",
};

export function CheckoutOverlay({ phase, label, amountGhs }: CheckoutOverlayProps) {
  if (!phase) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-overlay-title"
      aria-busy="true"
    >
      <div
        className={cn(
          "w-full max-w-sm rounded-2xl border border-border bg-white p-8 text-center shadow-2xl",
          ""
        )}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/15">
          {phase === "verifying" ? (
            <ShieldCheck className="h-7 w-7 text-violet-700" aria-hidden />
          ) : (
            <Loader2 className="h-7 w-7 animate-spin text-violet-700" aria-hidden />
          )}
        </div>
        <h2 id="checkout-overlay-title" className="mt-5 text-xl font-bold text-foreground">
          {PHASE_COPY[phase]}
        </h2>
        {label && (
          <p className="mt-2 text-sm text-muted">
            {label}
            {amountGhs != null && (
              <>
                {" "}
                · <span className="font-medium text-foreground">{formatGhs(amountGhs)}</span>
              </>
            )}
          </p>
        )}
        {phase === "popup" && (
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Secured by Paystack. You can close this message once you finish or cancel in the popup.
          </p>
        )}
        {phase === "verifying" && (
          <p className="mt-3 text-xs text-muted">This usually takes a few seconds.</p>
        )}
      </div>
    </div>
  );
}
