import { RetiredProductNotice } from "@/components/product/RetiredProductNotice";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { RETIRED_PRODUCTS } from "@/lib/navigation/retiredProducts";
import { publicMetadata } from "@/lib/seo/publicMetadata";

const meta = RETIRED_PRODUCTS.find((p) => p.id === "video")!;

export const metadata = publicMetadata({
  path: "/video",
  title: "Video AI retired | Giga3 AI",
  description:
    "Standalone Video AI is no longer a dedicated Giga3 product. Continue with AI Assistant, Academy, Exam Practice, and GigaSocial.",
  index: false,
});

export default function VideoPage() {
  return (
    <>
      <ProductSeoHeader
        className="sr-only"
        compact
        title={meta.formerName}
        description={meta.summary}
        showProductNav={false}
      />
      <RetiredProductNotice formerName={meta.formerName} summary={meta.summary} />
    </>
  );
}
