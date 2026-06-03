"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { PaymentSuccess } from "@/components/billing/PaymentSuccess";
import { useBilling } from "@/hooks/useBilling";
import { planDisplayName } from "@/lib/credits/rules";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

export function PaymentSuccessPageClient() {
  return (
    <ConvexAppShell>
    <Suspense fallback={<p className="text-center text-muted">Loading payment…</p>}>
      <PaymentSuccessPageContent />
    </Suspense>
    </ConvexAppShell>
  );
}

function PaymentSuccessPageContent() {
  const params = useSearchParams();
  const reference = params.get("reference") ?? undefined;
  const { verify, reconcile } = useBilling();
  const [message, setMessage] = useState("Verifying your payment…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!reference) {
      setMessage("Payment reference missing.");
      setFailed(true);
      return;
    }

    let cancelled = false;

    async function runVerify(attempt: number) {
      try {
        const res =
          attempt > 0
            ? await reconcile(reference!)
            : await verify(reference!);
        if (cancelled) return;
        if (res.status === "success") {
          if (res.type === "credits") {
            setMessage(
              `Credits added${res.creditsGranted ? ` (+${res.creditsGranted})` : ""}.`
            );
          } else if (res.planId) {
            setMessage(
              `${planDisplayName(res.planId)} subscription activated. Credits refilled.`
            );
          } else {
            setMessage("Subscription activated. Credits refilled.");
          }
          setFailed(false);
        }
      } catch {
        if (cancelled) return;
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
          return runVerify(attempt + 1);
        }
        setMessage(
          "We could not verify this payment yet. If you were charged, credits may appear within a few minutes via Paystack webhook."
        );
        setFailed(true);
      }
    }

    void runVerify(0);
    return () => {
      cancelled = true;
    };
  }, [reference, verify, reconcile]);

  if (failed) {
    return (
      <PaymentSuccess
        title="Verification issue"
        message={message}
        reference={reference}
      />
    );
  }

  return <PaymentSuccess message={message} reference={reference} />;
}
