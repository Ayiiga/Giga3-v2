import { Container } from "@/components/ui/Container";
import { CreatorWorkflowIntro } from "@/components/seo/CreatorWorkflowIntro";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const CreatorPageRoot = dynamic(
  () =>
    import("@/components/creator-studio/CreatorPageRoot").then((m) => ({
      default: m.CreatorPageRoot,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

export const metadata = publicMetadata({
  path: "/creator-studio",
  title: "Creator Studio — Writing and Social Tools",
  description:
    "Giga3 AI Creator Studio offers writing assistance, image generation shortcuts, and social media drafting for creators who publish to GigaSocial and beyond.",
});

export default function CreatorStudioPage() {
  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "Creator Studio", path: "/creator-studio" },
        ]}
      />
      <ProductSeoHeader
        title="Creator Studio — Draft, design, and plan content"
        description="Plan posts, generate copy, and jump to Media Studio or GigaEdit when you need visuals or video."
        detail="Sign in to save drafts and use Giga3 AI credits."
        showProductNav={false}
        compact
      />
      <div className="creator-studio-stable section-padding pt-4 pb-8">
        <Container>
          <Suspense fallback={<p className="text-center text-muted">Loading Creator Studio…</p>}>
            <CreatorPageRoot />
          </Suspense>
        </Container>
      </div>
      <CreatorWorkflowIntro />
    </>
  );
}
