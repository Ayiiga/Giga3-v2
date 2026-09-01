import { PublicProductIntro } from "@/components/seo/PublicProductIntro";
import { JsonLd } from "@/components/seo/JsonLd";
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
      <PublicProductIntro
        compact
        title="GigaEdits"
        description="Create with AI: generate in Media Studio, edit video in GigaEdit, publish to GigaSocial."
        primaryHref="/gigaedit"
        primaryLabel="Open GigaEdit"
      />
    </>
  );
}
