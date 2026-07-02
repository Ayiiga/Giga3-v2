import dynamic from "next/dynamic";

const MarketplacePurchasesClient = dynamic(
  () =>
    import("@/components/marketplace/MarketplacePurchasesClient").then(
      (m) => m.MarketplacePurchasesClient
    ),
  { ssr: false }
);

export default function MarketplacePurchasesPage() {
  return (
    <div className="marketing-stable py-8 sm:py-12">
      <MarketplacePurchasesClient />
    </div>
  );
}
