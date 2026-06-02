import { Container } from "@/components/ui/Container";
import type { Metadata } from "next";
import dynamic from "next/dynamic";

const SubscribePageClient = dynamic(
  () =>
    import("@/components/billing/SubscribePageClient").then((m) => ({
      default: m.SubscribePageClient,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

export const metadata: Metadata = {
  title: "Subscribe",
  description: "Choose Basic, Pro, or Premium — Paystack billing in GHS",
};

export default function SubscribePage() {
  return (
    <div className="section-padding pt-28">
      <Container className="max-w-5xl">
        <SubscribePageClient />
      </Container>
    </div>
  );
}
