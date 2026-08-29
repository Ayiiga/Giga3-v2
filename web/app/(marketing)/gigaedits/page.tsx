import { PublicProductIntro } from "@/components/seo/PublicProductIntro";
import { publicMetadata } from "@/lib/seo/publicMetadata";

export const metadata = publicMetadata({
  path: "/gigaedits",
  title: "GigaEdits — AI Creator Tools",
  description:
    "GigaEdits by Giga3 AI brings creator editing tools, AI-assisted content workflows, and practical creative support into one mobile-ready space.",
});

export default function GigaEditsPage() {
  return (
    <PublicProductIntro
      title="GigaEdits — Create, edit, and publish with AI"
      description="GigaEdits is the creator experience in Giga3 AI for shaping ideas into polished visual and written content."
      audience="African creators, small teams, and businesses creating for the web."
      primaryHref="/gigaedit"
      primaryLabel="Open GigaEdits"
    />
  );
}
