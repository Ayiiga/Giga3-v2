import { Container } from "@/components/ui/Container";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { TrendingStaticShell } from "@/components/trends/TrendingStaticShell";
import { TrendCardSkeletonGrid } from "@/components/trends/TrendCardSkeletonGrid";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const TrendingPageClient = dynamic(
  () =>
    import("@/components/trends/TrendingPageClient").then((m) => ({
      default: m.TrendingPageClient,
    })),
  { ssr: false, loading: () => <TrendCardSkeletonGrid count={4} /> }
);

export const metadata = publicMetadata({
  path: "/trending",
  title: "Trending — Giga3 Hub Topics",
  description:
    "Trending topics across Giga3 Hub — artificial intelligence, coding, education, business, sports, technology, health, finance, entertainment, and the creator economy.",
});

export default function TrendingPage() {
  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 Hub", path: "/" },
          { name: "Trending", path: "/trending" },
        ]}
      />
      <ProductSeoHeader
        title="Trending topics"
        description="Curated category links and editorial picks across AI, education, business, and technology — not live platform usage rankings."
        showProductNav={false}
      />
      <div className="discover-stable section-padding pt-8 pb-8">
        <Container>
          <TrendingStaticShell />
          <div className="mt-12 border-t border-border pt-10">
            <Suspense fallback={<TrendCardSkeletonGrid count={4} />}>
              <TrendingPageClient />
            </Suspense>
          </div>
        </Container>
      </div>
    </>
  );
}
