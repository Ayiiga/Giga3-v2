import dynamic from "next/dynamic";

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
