"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { PaymentSuccess } from "@/components/billing/PaymentSuccess";
import { useBilling } from "@/hooks/useBilling";
import { planDisplayName } from "@/lib/credits/rules";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

const VERIFY_ATTEMPTS = 4;
const VERIFY_DELAY_MS = 1500;

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
  const { verify } = useBilling();
  const [message, setMessage] = useState("Confirming your payment…");
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!reference) {
      setMessage("Payment reference missing.");
      setFailed(true);
      return;
    }
    if (started.current) return;
    started.current = true;

    let cancelled = false;

    async function runVerify(attempt: number) {
      try {
        const res = (await verify(reference!)) as {
          status?: string;
          type?: string;
          creditsGranted?: number;
          planId?: string;
        };
        if (cancelled) return;
        if (res.status === "success") {
          if (res.type === "credits") {
            setMessage(
              `Payment confirmed${
                res.creditsGranted ? ` — ${res.creditsGranted} credits added` : ""
              }.`
            );
          } else if (res.planId) {
            setMessage(
              `${planDisplayName(res.planId)} subscription activated. Credits refilled.`
            );
          } else {
            setMessage("Payment confirmed. Credits refilled.");
          }
          setFailed(false);
          return;
        }
        throw new Error("Not successful yet");
      } catch {
        if (cancelled) return;
        if (attempt < VERIFY_ATTEMPTS - 1) {
          setMessage(`Confirming payment… (${attempt + 1}/${VERIFY_ATTEMPTS})`);
          await new Promise((r) => setTimeout(r, VERIFY_DELAY_MS));
          return runVerify(attempt + 1);
        }
        setMessage(
          "Payment received. Credits may take a minute to appear — refresh chat or credits if needed."
        );
        setFailed(false);
      }
    }

    void runVerify(0);
    return () => {
      cancelled = true;
    };
  }, [reference, verify]);

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
