import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { PublicProductPageShell } from "@/components/seo/PublicProductPageShell";
import { JsonLd } from "@/components/seo/JsonLd";
import { VIDEO_PAGE_SHELL } from "@/lib/seo/productPageContent";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const VideoStudioClient = dynamic(
  () =>
    import("@/components/video/VideoStudioClient").then((m) => m.VideoStudioClient),
  { ssr: false, loading: () => <ClientAppHydrationNotice productName="Video AI" /> }
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
      <PublicProductPageShell {...VIDEO_PAGE_SHELL} />
      <div className="media-stable section-padding pt-0 pb-8">
        <Suspense fallback={<ClientAppHydrationNotice productName="Video AI" />}>
          <VideoStudioClient />
        </Suspense>
      </div>
    </>
  );
}
