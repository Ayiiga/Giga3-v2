import { Container } from "@/components/ui/Container";
import { PricingPageClient } from "@/components/billing/PricingPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Giga3 AI plans in Ghana Cedis — Free, Premium, and credit packs",
};

export default function PricingPage() {
  return (
    <div className="section-padding pt-28">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight">Pricing</h1>
          <p className="mt-4 text-muted">
            Pay in <strong className="text-foreground">Ghana Cedis (GHS)</strong> via Paystack.
            Free tier for everyday chat; Premium for unlimited messages and media credits.
          </p>
        </div>
        <PricingPageClient />
      </Container>
    </div>
  );
}
