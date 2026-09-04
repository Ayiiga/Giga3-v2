import dynamic from "next/dynamic";
import { Suspense } from "react";
import { publicMetadata } from "@/lib/seo/publicMetadata";

const MarketplaceItemRouteShell = dynamic(
  () =>
    import("@/components/marketplace/MarketplaceItemRouteShell").then(
      (m) => m.MarketplaceItemRouteShell
    ),
  { ssr: false }
);

export const metadata = publicMetadata({
  path: "/marketplace/item",
  title: "Marketplace product",
  description:
    "View a digital product listing on the Giga3 AI Marketplace. Pay with Paystack in GHS to unlock downloads after purchase.",
  // Legacy ?id= redirect shell — the per-item static pages carry the indexable content.
  index: false,
});

export default function MarketplaceItemLegacyPage() {
  return (
    <Suspense fallback={null}>
      <MarketplaceItemRouteShell />
    </Suspense>
  );
}
