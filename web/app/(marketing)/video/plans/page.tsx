import { RetiredProductNotice } from "@/components/product/RetiredProductNotice";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { RETIRED_PRODUCTS } from "@/lib/navigation/retiredProducts";
import { publicMetadata } from "@/lib/seo/publicMetadata";

const meta = RETIRED_PRODUCTS.find((p) => p.id === "video")!;

export const metadata = publicMetadata({
  path: "/video/plans",
  title: "Video AI Plans retired | Giga3 AI",
  description:
    "Standalone Video AI plans are retired with Media Studio. Continue with AI Assistant, Academy, Exam Practice, and GigaSocial.",
  index: false,
});

export default function VideoPlansPage() {
  return (
    <>
      <ProductSeoHeader
        className="sr-only"
        compact
        title={`${meta.formerName} Plans`}
        description={meta.summary}
        showProductNav={false}
      />
      <RetiredProductNotice
        formerName={`${meta.formerName} Plans`}
        summary={meta.summary}
      />
    </>
  );
}
