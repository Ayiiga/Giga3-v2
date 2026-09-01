import { CreatorWorkflowIntro } from "@/components/seo/CreatorWorkflowIntro";
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
        title="GigaEdits — Create, edit, and publish with AI"
        description="GigaEdits is the creator experience in Giga3 AI for shaping ideas into polished visual and written content. Generate assets in Media Studio, refine video in GigaEdit, and publish to GigaSocial."
        audience="African creators, small teams, and businesses creating for the web"
        primaryHref="/gigaedit"
        primaryLabel="Open GigaEdit"
      />
      <CreatorWorkflowIntro />
    </>
  );
}
