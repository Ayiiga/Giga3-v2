import dynamic from "next/dynamic";

const MarketplaceItemClient = dynamic(
  () =>
    import("@/components/marketplace/MarketplaceItemClient").then(
      (m) => m.MarketplaceItemClient
    ),
  { ssr: false }
);

export default function MarketplaceItemPage() {
  return <MarketplaceItemClient />;
}
