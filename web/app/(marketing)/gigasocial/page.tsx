import { Container } from "@/components/ui/Container";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { withChunkRetryLoader } from "@/lib/pwa/dynamicWithChunkRetry";
import { publicMetadata } from "@/lib/seo/publicMetadata";
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
    "GigaSocial by Giga3 AI is an AI-powered community for creators in Africa to connect, share posts, discover topics, and publish work from GigaEdit and Media Studio.",
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
        title="GigaSocial — Connect, share, and collaborate with AI"
        description="GigaSocial is Giga3 AI's community space for sharing ideas, discovering creators, and learning together. Public posts and profiles are visible to signed-in members; private posts and messages stay private."
        detail="Publish from GigaEdit, explore feeds and communities, and follow creators. Sign in to create your profile and join the conversation."
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
