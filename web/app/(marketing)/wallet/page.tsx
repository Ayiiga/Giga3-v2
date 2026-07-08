import { Container } from "@/components/ui/Container";
import type { Metadata } from "next";
import dynamic from "next/dynamic";

const WalletPageClient = dynamic(
  () =>
    import("@/components/wallet/WalletPageClient").then((m) => ({
      default: m.WalletPageClient,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

export const metadata: Metadata = {
  title: "GigaWallet",
  description:
    "Credits, subscriptions, creator earnings, and billing history for Giga3 AI",
};

export default function WalletPage() {
  return (
    <div className="section-padding pt-28">
      <Container className="max-w-5xl">
        <WalletPageClient />
      </Container>
    </div>
  );
}
