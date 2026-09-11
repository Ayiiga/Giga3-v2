import { PublicProductPageShell } from "@/components/seo/PublicProductPageShell";
import { JsonLd } from "@/components/seo/JsonLd";
import { GIGAEDITS_PAGE } from "@/lib/seo/productPageContent";
import { publicMetadata } from "@/lib/seo/publicMetadata";

export const metadata = publicMetadata({
  path: "/gigaedits",
  title: "GigaEdits — Creator editing on Giga3",
  description: GIGAEDITS_PAGE.description,
});

export default function GigaEditsPage() {
  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "GigaEdits", path: "/gigaedits" },
        ]}
      />
      <PublicProductPageShell {...GIGAEDITS_PAGE} />
    </>
  );
}
