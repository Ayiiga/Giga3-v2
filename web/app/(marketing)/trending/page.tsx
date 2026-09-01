import { Container } from "@/components/ui/Container";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const TrendingPageClient = dynamic(
  () =>
    import("@/components/trends/TrendingPageClient").then((m) => ({
      default: m.TrendingPageClient,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading trends…</p> }
);

export const metadata = publicMetadata({
  path: "/trending",
  title: "Trending — Giga3 AI Topics",
  description:
    "Trending AI topics on Giga3 AI — artificial intelligence, coding, education, business, sports, technology, health, finance, entertainment, and the creator economy.",
});

export default function TrendingPage() {
  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "Trending", path: "/trending" },
        ]}
      />
      <ProductSeoHeader
        title="Trending topics"
        description="See what creators, students, and professionals are exploring across AI, education, business, and technology on Giga3 AI."
        showProductNav={false}
      />
      <div className="discover-stable section-padding pt-8 pb-8">
        <Container>
          <Suspense fallback={<p className="text-center text-muted">Loading trends…</p>}>
            <TrendingPageClient />
          </Suspense>
        </Container>
      </div>
    </>
  );
}
