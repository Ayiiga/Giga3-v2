import { Container } from "@/components/ui/Container";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { withChunkRetryLoader } from "@/lib/pwa/dynamicWithChunkRetry";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const GigaSocialPublicProfileRoot = dynamic(
  withChunkRetryLoader(() =>
    import("@/components/gigasocial/GigaSocialPublicProfileClient").then((m) => ({
      default: m.GigaSocialPublicProfileRoot,
    }))
  ),
  {
    ssr: false,
    loading: () => <p className="text-center text-muted">Loading profile…</p>,
  }
);

export const metadata = publicMetadata({
  path: "/gigasocial/profile",
  title: "GigaSocial creator profile",
  description:
    "View a public creator profile on GigaSocial — posts, photos, videos, and AI creations shared with the Giga3 AI community.",
});

export default function GigaSocialPublicProfilePage() {
  return (
    <>
      <ProductSeoHeader
        title="GigaSocial creator profile"
        description="Public profiles show only posts and media the creator chose to share publicly. Private posts, followers-only content, and messages are not shown here."
        showProductNav={false}
      />
      <div className="marketing-stable section-padding pt-8 pb-8">
        <Container>
          <Suspense fallback={<p className="text-center text-muted">Loading profile…</p>}>
            <GigaSocialPublicProfileRoot />
          </Suspense>
        </Container>
      </div>
    </>
  );
}
