import { Container } from "@/components/ui/Container";
import { MediaErrorBoundary } from "@/components/media/MediaErrorBoundary";
import type { Metadata } from "next";
import dynamic from "next/dynamic";

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
        <MediaErrorBoundary>
          <MediaStudioClient />
        </MediaErrorBoundary>
      </Container>
    </div>
  );
}
