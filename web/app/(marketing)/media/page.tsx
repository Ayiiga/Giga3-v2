import { Container } from "@/components/ui/Container";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const MediaPageRoot = dynamic(
  () =>
    import("@/components/media/MediaPageRoot").then((m) => ({
      default: m.MediaPageRoot,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

export const metadata: Metadata = {
  title: "Media Studio",
  description: "Generate images and videos with Giga3 AI — fal.ai with provider fallback",
};

export default function MediaPage() {
  return (
    <div className="media-stable section-padding pt-28">
      <Container>
        <Suspense fallback={<p className="text-center text-muted">Loading studio…</p>}>
          <MediaPageRoot />
        </Suspense>
      </Container>
    </div>
  );
}
