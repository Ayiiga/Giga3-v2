"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { PaymentFailed } from "@/components/billing/PaymentFailed";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export function PaymentFailedPageClient() {
  return (
    <ConvexAppShell>
    <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
      <PaymentFailedPageContent />
    </Suspense>
    </ConvexAppShell>
  );
}

function PaymentFailedPageContent() {
  const params = useSearchParams();
  const reference = params.get("reference") ?? undefined;
  const reason = params.get("reason") ?? "Your payment was cancelled or declined.";

  return <PaymentFailed message={reason} reference={reference} />;
}
