import { Container } from "@/components/ui/Container";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { withChunkRetryLoader } from "@/lib/pwa/dynamicWithChunkRetry";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const GigaSocialPublicPostRoot = dynamic(
  withChunkRetryLoader(() =>
    import("@/components/gigasocial/GigaSocialPublicPostClient").then((m) => ({
      default: m.GigaSocialPublicPostRoot,
    }))
  ),
  {
    ssr: false,
    loading: () => <p className="text-center text-muted">Loading post…</p>,
  }
);

export const metadata = publicMetadata({
  path: "/gigasocial/post",
  title: "GigaSocial post",
  description:
    "View a shared public post from GigaSocial on Giga3 AI — connect, share videos, and join the community.",
});

export default function GigaSocialPublicPostPage() {
  return (
    <>
      <ProductSeoHeader
        title="GigaSocial post"
        description="Shared posts open from public links. Only content marked public by the creator is available without signing in."
        showProductNav={false}
      />
      <div className="marketing-stable section-padding pt-8 pb-8">
        <Container>
          <Suspense fallback={<p className="text-center text-muted">Loading post…</p>}>
            <GigaSocialPublicPostRoot />
          </Suspense>
        </Container>
      </div>
    </>
  );
}
