"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { PaymentSuccess } from "@/components/billing/PaymentSuccess";
import { useBilling } from "@/hooks/useBilling";
import { getSessionToken } from "@/lib/auth";
import { planDisplayName } from "@/lib/credits/rules";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

const VERIFY_ATTEMPTS = 5;
const VERIFY_DELAY_MS = 1500;

type VerifyResult = {
  status?: string;
  alreadyFulfilled?: boolean;
  type?: string;
  planId?: string;
  creditsGranted?: number;
};

function successMessage(res: VerifyResult, isMarketplace: boolean): string {
  if (res.type === "marketplace" || isMarketplace) {
    return "Purchase confirmed. Your download is ready in My purchases.";
  }
  if (res.type === "credits") {
    return `Payment confirmed${
      res.creditsGranted ? ` — ${res.creditsGranted} credits added` : ""
    }.`;
  }
  if (res.planId) {
    return `${planDisplayName(res.planId)} subscription activated. Credits refilled.`;
  }
  return "Payment confirmed.";
}

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
  const isMarketplaceParam = params.get("marketplace") === "1";
  const { verify, reconcile } = useBilling();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [message, setMessage] = useState("Confirming your payment…");
  const [phase, setPhase] = useState<"confirming" | "success" | "pending" | "failed">(
    "confirming"
  );
  const [retrying, setRetrying] = useState(false);
  const [isMarketplace, setIsMarketplace] = useState(isMarketplaceParam);
  const started = useRef(false);

  useEffect(() => {
    setSessionToken(getSessionToken());
  }, []);

  const paymentRecord = useQuery(
    api.paystack.getPaymentByReference,
    reference && sessionToken ? { reference, sessionToken } : "skip"
  );

  const applySuccess = useCallback((res: VerifyResult) => {
    if (res.type === "marketplace") setIsMarketplace(true);
    setMessage(successMessage(res, isMarketplaceParam));
    setPhase("success");
  }, [isMarketplaceParam]);

  const runVerification = useCallback(
    async (attempt: number): Promise<boolean> => {
      if (!reference) return false;
      try {
        const res = (attempt > 0
          ? await reconcile(reference)
          : await verify(reference)) as VerifyResult;
        const ok =
          res.status === "success" ||
          ("alreadyFulfilled" in res && Boolean(res.alreadyFulfilled));
        if (ok) {
          applySuccess(res);
          return true;
        }
        throw new Error("Not successful yet");
      } catch {
        if (attempt < VERIFY_ATTEMPTS - 1) {
          setMessage(`Confirming payment… (${attempt + 1}/${VERIFY_ATTEMPTS})`);
          await new Promise((r) => setTimeout(r, VERIFY_DELAY_MS));
          return runVerification(attempt + 1);
        }
        return false;
      }
    },
    [reference, verify, reconcile, applySuccess]
  );

  useEffect(() => {
    if (!reference) {
      setMessage("Payment reference missing.");
      setPhase("failed");
      return;
    }
    if (paymentRecord === undefined) return;

    if (paymentRecord?.status === "success") {
      applySuccess({
        type: paymentRecord.type,
        planId: paymentRecord.planId,
        creditsGranted: paymentRecord.creditsGranted,
      });
      return;
    }

    if (paymentRecord?.status === "failed") {
      setMessage("This payment was declined or cancelled.");
      setPhase("failed");
      return;
    }

    if (started.current) return;
    started.current = true;

    let cancelled = false;

    void (async () => {
      const ok = await runVerification(0);
      if (cancelled) return;
      if (!ok) {
        setMessage(
          "We received your payment but confirmation is taking longer than usual. Tap below to check again — credits usually appear within a minute."
        );
        setPhase("pending");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reference, paymentRecord, runVerification, applySuccess]);

  const handleRetry = useCallback(async () => {
    if (!reference) return;
    setRetrying(true);
    setMessage("Checking payment status…");
    setPhase("confirming");
    const ok = await runVerification(0);
    if (!ok) {
      setMessage(
        "Still confirming. If you completed payment, wait a moment and try again, or refresh chat to see updated credits."
      );
      setPhase("pending");
    }
    setRetrying(false);
  }, [reference, runVerification]);

  if (phase === "failed") {
    return (
      <PaymentSuccess
        title="Verification issue"
        message={message}
        reference={reference}
        primaryHref="/payment/failed"
        primaryLabel="Payment help"
        secondaryHref="/credits"
        secondaryLabel="Try again"
      />
    );
  }

  if (phase === "pending") {
    return (
      <PaymentSuccess
        title="Payment processing"
        message={message}
        reference={reference}
        pending
        onRetry={handleRetry}
        retrying={retrying}
      />
    );
  }

  if (phase === "confirming") {
    return (
      <PaymentSuccess
        title="Confirming payment"
        message={message}
        reference={reference}
        pending
      />
    );
  }

  if (isMarketplace) {
    return (
      <PaymentSuccess
        title="Purchase successful"
        message={message}
        reference={reference}
        primaryHref="/marketplace/purchases"
        primaryLabel="Go to My purchases"
        secondaryHref="/marketplace"
        secondaryLabel="Browse marketplace"
      />
    );
  }

  return <PaymentSuccess message={message} reference={reference} />;
}
