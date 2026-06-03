import { Container } from "@/components/ui/Container";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const MediaStudioClient = dynamic(
  () =>
    import("@/components/media/MediaStudioClient").then((m) => ({
      default: m.MediaStudioClient,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

export const metadata: Metadata = {
  title: "Media Studio",
  description: "Generate images and videos with Giga3 AI and Replicate",
};

export default function MediaPage() {
  return (
    <div className="section-padding pt-28">
      <Container>
        <Suspense fallback={<p className="text-center text-muted">Loading studio…</p>}>
          <MediaStudioClient />
        </Suspense>
      </Container>
    </div>
  );
}
