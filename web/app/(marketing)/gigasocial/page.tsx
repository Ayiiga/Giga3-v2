import { Container } from "@/components/ui/Container";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { withChunkRetryLoader } from "@/lib/pwa/dynamicWithChunkRetry";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const GigaSocialPageRoot = dynamic(
  withChunkRetryLoader(() =>
    import("@/components/gigasocial/GigaSocialPageRoot").then((m) => ({
      default: m.GigaSocialPageRoot,
    }))
  ),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

export const metadata = publicMetadata({
  path: "/gigasocial",
  title: "GigaSocial — AI-Powered Community",
  description:
    "GigaSocial by Giga3 AI is a community for creators to connect, share posts, discover topics, and publish directly to their audience.",
});

export default function GigaSocialPage() {
  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "GigaSocial", path: "/gigasocial" },
        ]}
      />
      <ProductSeoHeader
        compact
        title="GigaSocial"
        description="Share posts, follow creators, and connect with the Giga3 AI community. Sign in to join."
        showProductNav={false}
      />
      <div className="gigasocial-page-shell gigasocial-stable gigasocial-premium w-full max-w-full px-3 pb-3 pt-4 sm:px-6 sm:pb-6 sm:pt-6">
        <Container className="!px-0">
          <Suspense fallback={<p className="text-center text-muted">Loading GigaSocial…</p>}>
            <GigaSocialPageRoot />
          </Suspense>
        </Container>
      </div>
    </>
  );
}
