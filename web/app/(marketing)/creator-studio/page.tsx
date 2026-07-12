import { Container } from "@/components/ui/Container";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const CreatorPageRoot = dynamic(
  () =>
    import("@/components/creator-studio/CreatorPageRoot").then((m) => ({
      default: m.CreatorPageRoot,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

export const metadata: Metadata = {
  title: "Creator Studio",
  description:
    "Giga3 AI Creator Studio — writing tools, image generation, social media assistant, and creator workspace",
};

export default function CreatorStudioPage() {
  return (
    <div className="creator-studio-stable section-padding pt-28">
      <Container>
        <Suspense fallback={<p className="text-center text-muted">Loading Creator Studio…</p>}>
          <CreatorPageRoot />
        </Suspense>
      </Container>
    </div>
  );
}
