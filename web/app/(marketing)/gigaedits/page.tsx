import { PublicProductPageShell } from "@/components/seo/PublicProductPageShell";
import { JsonLd } from "@/components/seo/JsonLd";
import { GIGAEDITS_PAGE } from "@/lib/seo/productPageContent";
import { publicMetadata } from "@/lib/seo/publicMetadata";

export const metadata = publicMetadata({
  path: "/gigaedits",
  title: "GigaEdits — AI Creator Tools",
  description:
    "GigaEdits by Giga3 AI brings creator editing tools, AI-assisted content workflows, and practical creative support into one mobile-ready space.",
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
