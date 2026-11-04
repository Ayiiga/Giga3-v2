import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import { TeachingResourcesLibrary } from "@/components/gigalearn/TeachingResourcesLibrary";

export const metadata = publicMetadata({
  path: "/gigalearn/resources",
  title: "Teaching Materials & Practical Resources | GigaLearn",
  description: "Explore Ghana JHS and SHS teaching materials, laboratory equipment, practical guides and learning resources.",
});

export default function TeachingResourcesPage() {
  return (
    <>
      <JsonLd webPage={{ path: "/gigalearn/resources", name: "Teaching Materials & Practical Resources", description: "Ghana JHS and SHS practical learning library." }} />
      <JsonLd breadcrumbs={[{ name: "Giga3 AI", path: "/" }, { name: "GigaLearn", path: "/gigalearn" }, { name: "Teaching Resources", path: "/gigalearn/resources" }]} />
      <ProductSeoHeader compact title="Teaching Materials & Practical Resources" description="Explore Ghana JHS and SHS practical learning materials." showProductNav={false} />
      <div className="marketing-stable gigalearn-stable section-padding pt-4 pb-6 sm:pt-6 px-4 sm:px-6"><TeachingResourcesLibrary /></div>
    </>
  );
}
