import { Container } from "@/components/ui/Container";
import { SubscribePageClient } from "@/components/billing/SubscribePageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscribe",
  description: "Upgrade to Giga3 AI Premium — Paystack, Ghana Cedis",
};

export default function SubscribePage() {
  return (
    <div className="section-padding pt-28">
      <Container className="max-w-lg">
        <SubscribePageClient />
      </Container>
    </div>
  );
}
