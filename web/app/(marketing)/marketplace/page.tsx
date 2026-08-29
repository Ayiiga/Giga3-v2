import dynamic from "next/dynamic";
import { publicMetadata } from "@/lib/seo/publicMetadata";

export const metadata = publicMetadata({
  path: "/marketplace",
  title: "Giga3 AI Marketplace",
  description:
    "Explore the Giga3 AI Marketplace for digital products and services from creators and businesses.",
});

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
