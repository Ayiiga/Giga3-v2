import dynamic from "next/dynamic";
import { Suspense } from "react";
import { publicMetadata } from "@/lib/seo/publicMetadata";

const MarketplaceItemLegacyRedirect = dynamic(
  () =>
    import("@/components/marketplace/MarketplaceItemLegacyRedirect").then(
      (m) => m.MarketplaceItemLegacyRedirect
    ),
  { ssr: false }
);

export const metadata = publicMetadata({
  path: "/marketplace/item",
  title: "Marketplace product",
  description:
    "View a digital product listing on the Giga3 AI Marketplace. Pay with Paystack in GHS to unlock downloads after purchase.",
});

export default function MarketplaceItemLegacyPage() {
  return (
    <Suspense fallback={null}>
      <MarketplaceItemLegacyRedirect />
    </Suspense>
  );
}
