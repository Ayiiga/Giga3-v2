import { MediaRetiredGate } from "@/components/product/MediaRetiredGate";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { RETIRED_PRODUCTS } from "@/lib/navigation/retiredProducts";
import { publicMetadata } from "@/lib/seo/publicMetadata";

const meta = RETIRED_PRODUCTS.find((p) => p.id === "media")!;

export const metadata = publicMetadata({
  path: "/media",
  title: "Media Studio retired | Giga3 AI",
  description:
    "Media Studio is no longer a dedicated Giga3 product. Continue with AI Assistant, GigaLearn Academy, Exam Practice, and GigaSocial.",
  index: false,
});

export default function MediaPage() {
  return (
    <>
      <ProductSeoHeader
        className="sr-only"
        compact
        title={meta.formerName}
        description={meta.summary}
        showProductNav={false}
      />
      <MediaRetiredGate />
    </>
  );
}
