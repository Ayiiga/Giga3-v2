import { RetiredProductNotice } from "@/components/product/RetiredProductNotice";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { RETIRED_PRODUCTS } from "@/lib/navigation/retiredProducts";
import { publicMetadata } from "@/lib/seo/publicMetadata";

const meta = RETIRED_PRODUCTS.find((p) => p.id === "gigaedits")!;

export const metadata = publicMetadata({
  path: "/gigaedits",
  title: "GigaEdits retired | Giga3 AI",
  description:
    "GigaEdits is no longer a dedicated Giga3 product. Explore Academy, Exam Practice, AI Assistant, and GigaSocial.",
  index: false,
});

export default function GigaEditsMarketingPage() {
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
