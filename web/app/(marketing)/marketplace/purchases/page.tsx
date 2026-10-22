import dynamic from "next/dynamic";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketplace purchases",
  robots: { index: false, follow: false },
  // Self-canonical — do not inherit root layout homepage canonical.
  alternates: { canonical: "/marketplace/purchases/" },
};

const MarketplacePurchasesClient = dynamic(
  () =>
    import("@/components/marketplace/MarketplacePurchasesClient").then(
      (m) => m.MarketplacePurchasesClient
    ),
  { ssr: false }
);

export default function MarketplacePurchasesPage() {
  return <MarketplacePurchasesClient />;
}
