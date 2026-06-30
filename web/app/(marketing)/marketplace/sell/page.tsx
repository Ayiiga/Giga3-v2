import dynamic from "next/dynamic";

const MarketplaceSellClient = dynamic(
  () =>
    import("@/components/marketplace/MarketplaceSellClient").then(
      (m) => m.MarketplaceSellClient
    ),
  { ssr: false }
);

export default function MarketplaceSellPage() {
  return (
    <div className="marketing-stable py-8 sm:py-12">
      <MarketplaceSellClient />
    </div>
  );
}
