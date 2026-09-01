import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const VideoStudioClient = dynamic(
  () =>
    import("@/components/video/VideoStudioClient").then((m) => m.VideoStudioClient),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

export const metadata = publicMetadata({
  path: "/video",
  title: "Video AI — Giga3 AI Studio",
  description:
    "Generate and explore AI-assisted video workflows on Giga3 AI. Create clips for GigaEdit editing and GigaSocial publishing.",
});

export default function VideoPage() {
  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "Video AI", path: "/video" },
        ]}
      />
      <ProductSeoHeader
        compact
        title="Video AI"
        description="Explore AI-assisted video generation and creative workflows inside Giga3 AI."
        detail="Use Video AI alongside GigaEdit and GigaSocial to create, refine, and share video content."
        showProductNav={false}
      />
      <div className="media-stable section-padding pt-8 pb-8">
        <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
          <VideoStudioClient />
        </Suspense>
      </div>
    </>
  );
}
