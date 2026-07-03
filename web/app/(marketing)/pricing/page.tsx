import { Container } from "@/components/ui/Container";
import type { Metadata } from "next";
import dynamic from "next/dynamic";

const PricingPageClient = dynamic(
  () =>
    import("@/components/billing/PricingPageClient").then((m) => ({
      default: m.PricingPageClient,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

export const metadata: Metadata = {
  title: "Pricing",
  description: "Giga3 AI plans in Ghana Cedis — Basic, Pro, Premium, and credit packs",
};

export default function PricingPage() {
  return (
    <div className="section-padding pt-28 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="hero-title">Pricing</h1>
          <p className="mt-4 text-base leading-[1.7] text-muted">
            Pay in <strong className="text-foreground">Ghana Cedis (GHS)</strong> via
            Paystack. Subscription credits refill every billing period.
          </p>
        </div>
        <PricingPageClient />
      </Container>
    </div>
  );
}
