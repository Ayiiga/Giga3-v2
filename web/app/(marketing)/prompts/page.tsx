import { Container } from "@/components/ui/Container";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const PromptLibraryClient = dynamic(
  () =>
    import("@/components/prompts/PromptLibraryClient").then((m) => ({
      default: m.PromptLibraryClient,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading prompts…</p> }
);

export const metadata: Metadata = {
  title: "Prompt library",
  description:
    "Curated AI prompt library for education, coding, business, marketing, writing, design, programming, productivity, and research on Giga3 AI.",
};

export default function PromptsPage() {
  return (
    <div className="marketing-stable section-padding pt-28">
      <Container>
        <Suspense fallback={<p className="text-center text-muted">Loading prompts…</p>}>
          <PromptLibraryClient />
        </Suspense>
      </Container>
    </div>
  );
}
