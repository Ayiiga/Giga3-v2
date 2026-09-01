import { Container } from "@/components/ui/Container";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const MediaPageRoot = dynamic(
  () =>
    import("@/components/media/MediaPageRoot").then((m) => ({
      default: m.MediaPageRoot,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

export const metadata = publicMetadata({
  path: "/media",
  title: "Media Studio — AI Image Generation",
  description:
    "Media Studio on Giga3 AI generates and edits images with fal.ai, Replicate, and Google AI Studio backup. Create visuals for chat, GigaEdit, and GigaSocial.",
});

export default function MediaPage() {
  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "Media Studio", path: "/media" },
        ]}
      />
      <ProductSeoHeader
        compact
        title="Media Studio"
        description="Generate or edit AI images from prompts. Use results in chat, GigaEdit, or GigaSocial."
        showProductNav={false}
      />
      <div className="media-stable section-padding pt-8 pb-8">
        <Container>
          <Suspense fallback={<p className="text-center text-muted">Loading studio…</p>}>
            <MediaPageRoot />
          </Suspense>
        </Container>
      </div>
    </>
  );
}
