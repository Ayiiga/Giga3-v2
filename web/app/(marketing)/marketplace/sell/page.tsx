import dynamic from "next/dynamic";

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
