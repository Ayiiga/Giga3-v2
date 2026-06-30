import dynamic from "next/dynamic";

const MarketplaceBrowseClient = dynamic(
  () =>
    import("@/components/marketplace/MarketplaceBrowseClient").then(
      (m) => m.MarketplaceBrowseClient
    ),
  { ssr: false }
);

export default function MarketplacePage() {
  return (
    <div className="marketing-stable py-8 sm:py-12">
      <MarketplaceBrowseClient />
    </div>
  );
}
