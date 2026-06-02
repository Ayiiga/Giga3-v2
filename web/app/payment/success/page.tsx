import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const PaymentSuccessPageClient = dynamic(
  () =>
    import("@/components/billing/PaymentSuccessPageClient").then((m) => ({
      default: m.PaymentSuccessPageClient,
    })),
  { ssr: false }
);

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
