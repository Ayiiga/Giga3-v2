import { Container } from "@/components/ui/Container";
import type { Metadata } from "next";
import dynamic from "next/dynamic";

const CreditsPageClient = dynamic(
  () =>
    import("@/components/billing/CreditsPageClient").then((m) => ({
      default: m.CreditsPageClient,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

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
