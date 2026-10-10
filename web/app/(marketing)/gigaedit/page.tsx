import { Container } from "@/components/ui/Container";
import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { withChunkRetryLoader } from "@/lib/pwa/dynamicWithChunkRetry";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const GigaEditPageRoot = dynamic(
  withChunkRetryLoader(() =>
    import("@/components/gigaedit/GigaEditPageRoot").then((m) => ({
      default: m.GigaEditPageRoot,
    }))
  ),
  { ssr: false, loading: () => <ClientAppHydrationNotice productName="GigaEdit" /> }
);

export const metadata = publicMetadata({
  path: "/gigaedit",
  title: "GigaEdit — Video and Photo Editor",
  description:
    "GigaEdit on Giga3 AI is a creator studio for trimming, joining, captioning, and publishing video. Import clips, add audio, and post to GigaSocial when ready.",
});

export default function GigaEditPage() {
  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "GigaEdit", path: "/gigaedit" },
        ]}
      />
      <ProductSeoHeader
        compact
        title="GigaEdit — Trim, join, and publish video"
        description="Edit video and photos in the browser, then share finished work to GigaSocial."
        detail="Pair with Media Studio when you need AI-generated images first. See /gigaedits/ for the creator editing product overview. Available tools include multi-clip timelines, audio tracks, teleprompter recording, the Creator Growth Starter Pack (Hook Reel 9:16, YouTube Intro 16:9, Promo Poster 4:5), and offline project storage on supported devices. Format starters open a correctly sized project with a starter title — import your media and finish with Giga3 AI tools."
        showProductNav={false}
        className="gigaedit-seo-header"
      />
      <div className="gigaedit-page gigaedit-stable px-0 pb-3 pt-4 sm:px-3 sm:pb-6 sm:pt-6">
        <Container className="!px-0 sm:!px-4">
          <Suspense fallback={<ClientAppHydrationNotice productName="GigaEdit" />}>
            <GigaEditPageRoot />
          </Suspense>
        </Container>
      </div>
    </>
  );
}
