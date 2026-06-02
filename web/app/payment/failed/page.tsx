import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const PaymentFailedPageClient = dynamic(
  () =>
    import("@/components/billing/PaymentFailedPageClient").then((m) => ({
      default: m.PaymentFailedPageClient,
    })),
  { ssr: false }
);

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
