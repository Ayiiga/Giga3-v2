import { Container } from "@/components/ui/Container";
import { withChunkRetryLoader } from "@/lib/pwa/dynamicWithChunkRetry";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const GigaSocialPublicProfileRoot = dynamic(
  withChunkRetryLoader(() =>
    import("@/components/gigasocial/GigaSocialPublicProfileClient").then((m) => ({
      default: m.GigaSocialPublicProfileRoot,
    }))
  ),
  {
    ssr: false,
    loading: () => <p className="text-center text-muted">Loading profile…</p>,
  }
);

export const metadata: Metadata = {
  title: "GigaSocial profile",
  description: "View a creator profile on GigaSocial — posts, photos, videos, and AI creations.",
};

export default function GigaSocialPublicProfilePage() {
  return (
    <div className="marketing-stable section-padding pt-28">
      <Container>
        <Suspense fallback={<p className="text-center text-muted">Loading profile…</p>}>
          <GigaSocialPublicProfileRoot />
        </Suspense>
      </Container>
    </div>
  );
}
