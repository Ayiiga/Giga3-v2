import dynamic from "next/dynamic";
import { publicMetadata } from "@/lib/seo/publicMetadata";

export const metadata = publicMetadata({
  path: "/marketplace/item",
  title: "Marketplace product",
  description:
    "View a digital product listing on the Giga3 AI Marketplace. Pay with Paystack in GHS to unlock downloads after purchase.",
});

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
