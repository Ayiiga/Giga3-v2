import dynamic from "next/dynamic";

const MarketplaceItemClient = dynamic(
  () =>
    import("@/components/marketplace/MarketplaceItemClient").then(
      (m) => m.MarketplaceItemClient
    ),
  { ssr: false }
);

export default function MarketplaceItemPage() {
  return (
    <div className="marketing-stable py-8 sm:py-12">
      <MarketplaceItemClient />
    </div>
  );
}
