import { PublicProductIntro } from "@/components/seo/PublicProductIntro";
import { JsonLd } from "@/components/seo/JsonLd";
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
      <PublicProductIntro
        title="Giga3 AI Studio — Bring creative ideas to life"
        description="Giga3 AI Studio connects practical AI tools with creative workflows, so you can move from prompt to project in one place."
        audience="creators, students, and businesses exploring AI-powered media."
        primaryHref="/media"
        primaryLabel="Open Giga3 AI Studio"
      />
    </>
  );
}
