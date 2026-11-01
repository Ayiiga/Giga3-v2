import { GigaEditRetiredGate } from "@/components/product/GigaEditRetiredGate";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { publicMetadata } from "@/lib/seo/publicMetadata";

export const metadata = publicMetadata({
  path: "/gigaedit",
  title: "GigaEdits Studio | Giga3 AI",
  description:
    "Create and edit videos, photos, scripts, and creator content with GigaEdits on Giga3 AI.",
  index: false,
});

export default function GigaEditPage() {
  return (
    <>
      <ProductSeoHeader
        className="sr-only"
        compact
        title="GigaEdits Studio"
        description="Create and edit videos, photos, scripts, and creator content."
        showProductNav={false}
      />
      <GigaEditRetiredGate />
    </>
  );
}
