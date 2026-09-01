import { Container } from "@/components/ui/Container";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const DiscoverPageClient = dynamic(
  () =>
    import("@/components/trends/DiscoverPageClient").then((m) => ({
      default: m.DiscoverPageClient,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading discover…</p> }
);

export const metadata = publicMetadata({
  path: "/discover",
  title: "Discover — Prompts, Tools, and Communities",
  description:
    "Discover popular AI prompts, GigaLearn study resources, creator tools, marketplace listings, and GigaSocial communities on Giga3 AI.",
});

export default function DiscoverPage() {
  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "Discover", path: "/discover" },
        ]}
      />
      <ProductSeoHeader
        title="Discover — Explore the Giga3 AI ecosystem"
        description="Find trending prompts, educational resources, marketplace products, and community topics across Giga3 AI products in one place."
        detail="Use Discover to jump into AI Chat, GigaLearn, Media Studio, GigaEdit, GigaSocial, or the Marketplace without hunting through menus."
        showProductNav={false}
      />
      <div className="discover-stable section-padding pt-8 pb-8">
        <Container>
          <Suspense fallback={<p className="text-center text-muted">Loading discover…</p>}>
            <DiscoverPageClient />
          </Suspense>
        </Container>
      </div>
    </>
  );
}
