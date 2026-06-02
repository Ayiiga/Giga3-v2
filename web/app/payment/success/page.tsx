import { PaymentSuccessPageClient } from "@/components/billing/PaymentSuccessPageClient";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Payment successful",
};

export default function PaymentSuccessPage() {
  return (
    <div className="section-padding flex min-h-[70vh] items-center justify-center pt-24">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <PaymentSuccessPageClient />
      </Suspense>
    </div>
  );
}
