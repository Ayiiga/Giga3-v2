import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { PublicProductPageShell } from "@/components/seo/PublicProductPageShell";
import { JsonLd } from "@/components/seo/JsonLd";
import { MARKETPLACE_PAGE_SHELL } from "@/lib/seo/productPageContent";
import dynamic from "next/dynamic";
import { publicMetadata } from "@/lib/seo/publicMetadata";

const MARKETPLACE_META_DESCRIPTION =
  "Discover ebooks, templates, clothes, shoes and other goods on Giga3 AI Marketplace. Buy digital downloads with Paystack in GHS; enquire about physical goods.";

export const metadata = publicMetadata({
  path: "/marketplace",
  title: "Giga3 AI Marketplace — Discover. Buy. Sell. | Giga3 AI",
  description: MARKETPLACE_META_DESCRIPTION,
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
        webPage={{
          path: "/marketplace",
          name: "Giga3 AI Marketplace",
          description: MARKETPLACE_META_DESCRIPTION,
        }}
      />
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "Marketplace", path: "/marketplace" },
        ]}
      />
      <ProductSeoHeader
        compact
        expandLabel="Learn more"
        collapseLabel="Show less"
        title="Discover. Buy. Sell."
        description="Browse ebooks, learning materials, clothes, shoes and other products. Buy approved digital downloads with Paystack, or enquire about physical items directly inside Giga3 AI."
        detail="Digital purchases use Paystack, with downloads unlocked after verified payment. Physical goods are enquiry-only for now: no checkout, shipping or delivery guarantees are offered. Never send payment outside the app."
        showProductNav={false}
      />
      <MarketplaceBrowseClient />
      <PublicProductPageShell
        {...MARKETPLACE_PAGE_SHELL}
        title="Digital Products, Clothing, Shoes and More"
        titleAs="h2"
        compact
      />
    </>
  );
}
