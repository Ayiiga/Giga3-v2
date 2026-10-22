import dynamic from "next/dynamic";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketplace seller dashboard",
  robots: { index: false, follow: false },
  // Self-canonical — do not inherit root layout homepage canonical.
  alternates: { canonical: "/marketplace/sell/" },
};

const MarketplaceSellClient = dynamic(
  () =>
    import("@/components/marketplace/MarketplaceSellClient").then(
      (m) => m.MarketplaceSellClient
    ),
  { ssr: false }
);

export default function MarketplaceSellPage() {
  return <MarketplaceSellClient />;
}
