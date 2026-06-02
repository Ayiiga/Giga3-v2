"use client";

import { PaymentSuccess } from "@/components/billing/PaymentSuccess";
import { useBilling } from "@/hooks/useBilling";
import { planDisplayName } from "@/lib/credits/rules";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function PaymentSuccessPageClient() {
  const params = useSearchParams();
  const reference = params.get("reference") ?? undefined;
  const { verify } = useBilling();
  const [message, setMessage] = useState("Verifying your payment…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!reference) {
      setMessage("Payment reference missing.");
      setFailed(true);
      return;
    }
    void verify(reference)
      .then((res) => {
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
        }
      })
      .catch(() => {
        setMessage(
          "We could not verify this payment. Your webhook may still activate it shortly."
        );
        setFailed(true);
      });
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
