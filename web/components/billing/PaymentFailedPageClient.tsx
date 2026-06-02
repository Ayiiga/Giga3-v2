"use client";

import { PaymentFailed } from "@/components/billing/PaymentFailed";
import { useSearchParams } from "next/navigation";

export function PaymentFailedPageClient() {
  const params = useSearchParams();
  const reference = params.get("reference") ?? undefined;
  const reason = params.get("reason") ?? "Your payment was cancelled or declined.";

  return <PaymentFailed message={reason} reference={reference} />;
}
