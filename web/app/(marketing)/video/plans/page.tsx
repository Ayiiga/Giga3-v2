import dynamic from "next/dynamic";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { publicMetadata } from "@/lib/seo/publicMetadata";

const VideoPlansClient = dynamic(
  () =>
    import("@/components/video/VideoPlansClient").then((m) => m.VideoPlansClient),
  { ssr: false }
);

export const metadata = publicMetadata({
  path: "/video/plans",
  title: "Video AI Plans — Giga3 AI",
  description:
    "Video AI subscriptions and credit packs on Giga3 AI, billed in GHS via Paystack. Video credits are separate from chat credits.",
});

export default function VideoPlansPage() {
  return (
    <>
      <ProductSeoHeader
        title="Video AI Plans"
        description="Independent video subscriptions and credit packs for AI video generation. Video credits never mix with chat credits."
        showProductNav={false}
        compact
      />
      <div className="media-stable py-8 sm:py-12">
        <VideoPlansClient />
      </div>
    </>
  );
}
