import { PublicProductPageShell } from "@/components/seo/PublicProductPageShell";
import { JsonLd } from "@/components/seo/JsonLd";
import { AI_STUDIO_PAGE } from "@/lib/seo/productPageContent";
import { publicMetadata } from "@/lib/seo/publicMetadata";

export const metadata = publicMetadata({
  path: "/ai-studio",
  title: "Giga3 AI Studio — Creative AI Tools",
  description:
    "Giga3 AI Studio helps creators explore AI-assisted image and media workflows from one mobile-ready African AI super app.",
});

export default function AiStudioPage() {
  return (
    <>
      <JsonLd type="SoftwareApplication" />
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "Giga3 AI Studio", path: "/ai-studio" },
        ]}
      />
      <PublicProductPageShell {...AI_STUDIO_PAGE} />
    </>
  );
}
