import { PaymentFailedPageClient } from "@/components/billing/PaymentFailedPageClient";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Payment failed",
};

export default function PaymentFailedPage() {
  return (
    <div className="section-padding flex min-h-[70vh] items-center justify-center pt-24">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <PaymentFailedPageClient />
      </Suspense>
    </div>
  );
}
