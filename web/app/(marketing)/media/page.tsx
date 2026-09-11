import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { PublicProductPageShell } from "@/components/seo/PublicProductPageShell";
import { JsonLd } from "@/components/seo/JsonLd";
import { MEDIA_PAGE_SHELL } from "@/lib/seo/productPageContent";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const MediaPageRoot = dynamic(
  () =>
    import("@/components/media/MediaPageRoot").then((m) => ({
      default: m.MediaPageRoot,
    })),
  {
    ssr: false,
    loading: () => <ClientAppHydrationNotice productName="Media Studio" />,
  }
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
      <PublicProductPageShell {...MEDIA_PAGE_SHELL} />
      <div className="media-stable section-padding pt-0 pb-8">
        <Suspense fallback={<ClientAppHydrationNotice productName="Media Studio" />}>
          <MediaPageRoot />
        </Suspense>
      </div>
    </>
  );
}
