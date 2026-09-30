"use client";

import { formatGhs } from "@/lib/payments/plans";
import { cn } from "@/lib/utils";
import { Loader2, ShieldCheck } from "lucide-react";

export type CheckoutPhase =
  | "preparing"
  | "opening"
  | "redirecting"
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
  opening: "Loading Paystack… wait a sec",
  redirecting: "Opening Paystack secure checkout…",
  popup: "Complete payment in the Paystack window",
  verifying: "Confirming your payment…",
};

const PHASE_HINT: Partial<Record<Exclude<CheckoutPhase, null>, string>> = {
  preparing: "Connecting to Paystack. Do not close this page.",
  opening: "Secured by Paystack · MTN MoMo, card, and bank supported.",
  redirecting: "You will be redirected to Paystack in a moment.",
  popup: "Finish or cancel in the Paystack window. This page will update when you are done.",
  verifying: "This usually takes a few seconds.",
};

/** Full-screen checkout shield — stays visible until Paystack is ready or redirect starts. */
export function CheckoutOverlay({ phase, label, amountGhs }: CheckoutOverlayProps) {
  if (!phase) return null;

  const blocking = phase === "preparing" || phase === "opening" || phase === "redirecting";

  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] flex items-center justify-center p-4",
        blocking ? "bg-white" : "bg-black/50 backdrop-blur-sm"
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-overlay-title"
      aria-busy="true"
    >
      <div
        className={cn(
          "w-full max-w-sm rounded-2xl border border-border bg-white p-8 text-center shadow-2xl",
          "animate-fade-in"
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
        {PHASE_HINT[phase] && (
          <p className="mt-3 text-xs leading-relaxed text-muted">{PHASE_HINT[phase]}</p>
        )}
      </div>
    </div>
  );
}
