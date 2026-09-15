import { Container } from "@/components/ui/Container";
import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
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
      <ProductSeoHeader
        className="sr-only"
        compact
        title={MEDIA_PAGE_SHELL.title}
        description={MEDIA_PAGE_SHELL.description}
        showProductNav={false}
      />
      <div className="media-stable w-full max-w-full px-3 pb-3 pt-4 sm:px-6 sm:pb-6 sm:pt-6">
        <Container className="!px-0">
          <Suspense fallback={<ClientAppHydrationNotice productName="Media Studio" />}>
            <MediaPageRoot />
          </Suspense>
        </Container>
      </div>
    </>
  );
}
