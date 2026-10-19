import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { PublicProductPageShell } from "@/components/seo/PublicProductPageShell";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { MARKETPLACE_PAGE_SHELL } from "@/lib/seo/productPageContent";
import dynamic from "next/dynamic";
import { publicMetadata } from "@/lib/seo/publicMetadata";

const MARKETPLACE_META_DESCRIPTION =
  "Browse digital products on the Giga3 AI Marketplace — ebooks, templates, and educational resources from verified creators. Pay with Paystack in GHS.";

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
        description="Explore ebooks, study notes, templates, and digital resources from Giga3 creators. Buy securely in Ghana cedis or sell your own digital products."
        detail="Verified sellers and admin-reviewed uploads help reduce fraud. Browse by category, compare prices in Ghana Cedis, and keep purchases in your account history. Files unlock only after Paystack payment is verified."
        showProductNav={false}
        actions={
          <>
            <ButtonLink href="#marketplace-catalogue">Browse Products</ButtonLink>
            <ButtonLink href="/marketplace/sell" variant="secondary">
              Start Selling
            </ButtonLink>
          </>
        }
      />
      <MarketplaceBrowseClient />
      <PublicProductPageShell
        {...MARKETPLACE_PAGE_SHELL}
        title="Digital Products for Learning, Business, and Creativity"
        titleAs="h2"
        compact
      />
    </>
  );
}
