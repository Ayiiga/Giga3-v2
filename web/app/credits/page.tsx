import { Container } from "@/components/ui/Container";
import { CreditsPageClient } from "@/components/billing/CreditsPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buy Credits",
  description: "Purchase Giga3 AI media credits in Ghana Cedis",
};

export default function CreditsPage() {
  return (
    <div className="section-padding pt-28">
      <Container className="max-w-3xl">
        <CreditsPageClient />
      </Container>
    </div>
  );
}
