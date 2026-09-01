import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import dynamic from "next/dynamic";
import { publicMetadata } from "@/lib/seo/publicMetadata";

export const metadata = publicMetadata({
  path: "/marketplace",
  title: "Giga3 AI Marketplace",
  description:
    "Browse digital products on the Giga3 AI Marketplace — ebooks, templates, and educational resources from verified creators. Pay with Paystack in GHS.",
});

const MarketplaceBrowseClient = dynamic(
  () =>
    import("@/components/marketplace/MarketplaceBrowseClient").then(
      (m) => m.MarketplaceBrowseClient
    ),
  { ssr: false }
);

export default function MarketplacePage() {
  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "Marketplace", path: "/marketplace" },
        ]}
      />
      <ProductSeoHeader
        title="Giga3 AI Marketplace — Buy digital products safely"
        description="Discover ebooks, templates, lesson notes, and business documents from Giga3 creators. Checkout runs through Paystack — files unlock only after payment."
        detail="Verified sellers and admin-reviewed uploads help reduce fraud. Browse by category, compare prices in Ghana Cedis, and keep purchases in your account history."
        showProductNav={false}
      />
      <MarketplaceBrowseClient />
    </>
  );
}
