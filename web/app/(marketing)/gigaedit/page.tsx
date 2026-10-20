import { GigaEditRetiredGate } from "@/components/product/GigaEditRetiredGate";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { RETIRED_PRODUCTS } from "@/lib/navigation/retiredProducts";
import { publicMetadata } from "@/lib/seo/publicMetadata";

const meta = RETIRED_PRODUCTS.find((p) => p.id === "gigaedit")!;

export const metadata = publicMetadata({
  path: "/gigaedit",
  title: "GigaEdit retired | Giga3 AI",
  description:
    "GigaEdit is no longer a dedicated Giga3 product. Local drafts on your device are not deleted. Continue with AI Assistant, Academy, and GigaSocial.",
  index: false,
});

export default function GigaEditPage() {
  return (
    <>
      <ProductSeoHeader
        className="sr-only"
        compact
        title={meta.formerName}
        description={meta.summary}
        showProductNav={false}
      />
      <GigaEditRetiredGate />
    </>
  );
}
