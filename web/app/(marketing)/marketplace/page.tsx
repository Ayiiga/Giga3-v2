import dynamic from "next/dynamic";

const MarketplaceBrowseClient = dynamic(
  () =>
    import("@/components/marketplace/MarketplaceBrowseClient").then(
      (m) => m.MarketplaceBrowseClient
    ),
  { ssr: false }
);

export default function MarketplacePage() {
  return <MarketplaceBrowseClient />;
}
