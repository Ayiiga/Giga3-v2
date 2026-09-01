import { Container } from "@/components/ui/Container";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const PromptLibraryClient = dynamic(
  () =>
    import("@/components/prompts/PromptLibraryClient").then((m) => ({
      default: m.PromptLibraryClient,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading prompts…</p> }
);

export const metadata = publicMetadata({
  path: "/prompts",
  title: "Prompt Library — Giga3 AI",
  description:
    "Curated AI prompt library for education, coding, business, marketing, writing, design, programming, productivity, and research on Giga3 AI.",
});

export default function PromptsPage() {
  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "Prompt library", path: "/prompts" },
        ]}
      />
      <ProductSeoHeader
        title="Prompt library"
        description="Browse curated prompts for education, coding, business, writing, and creative work — ready to use in Giga3 AI Chat."
        detail="Find starter prompts for students, teachers, creators, and professionals across Ghana and Africa."
        showProductNav={false}
      />
      <div className="marketing-stable section-padding pt-8 pb-8">
        <Container>
          <Suspense fallback={<p className="text-center text-muted">Loading prompts…</p>}>
            <PromptLibraryClient />
          </Suspense>
        </Container>
      </div>
    </>
  );
}
