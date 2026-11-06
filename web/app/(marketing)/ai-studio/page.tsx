import { RetiredProductNotice } from "@/components/product/RetiredProductNotice";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { RETIRED_PRODUCTS } from "@/lib/navigation/retiredProducts";
import { publicMetadata } from "@/lib/seo/publicMetadata";

const meta = RETIRED_PRODUCTS.find((p) => p.id === "ai-studio")!;

export const metadata = publicMetadata({
  path: "/ai-studio",
  title: "AI Studio retired | Giga3 Hub",
  description:
    "The former AI Studio umbrella is retired. Continue exploring Giga3 Hub services including Giga3 AI, GigaLearn Academy, Exam Practice and GigaSocial.",
  index: false,
});

export default function AiStudioPage() {
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
