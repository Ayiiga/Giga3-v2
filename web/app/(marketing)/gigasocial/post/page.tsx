import { Container } from "@/components/ui/Container";
import { dynamicWithChunkRetry } from "@/lib/pwa/dynamicWithChunkRetry";
import type { Metadata } from "next";
import { Suspense } from "react";

const GigaSocialPublicPostRoot = dynamicWithChunkRetry(
  () =>
    import("@/components/gigasocial/GigaSocialPublicPostClient").then((m) => ({
      default: m.GigaSocialPublicPostRoot,
    })),
  {
    ssr: false,
    loading: () => <p className="text-center text-muted">Loading post…</p>,
  }
);

export const metadata: Metadata = {
  title: "GigaSocial post",
  description:
    "View a shared post from GigaSocial on Giga3 AI — connect, share videos, and join the community.",
  openGraph: {
    title: "GigaSocial post on Giga3 AI",
    description:
      "Watch and read shared posts from the Giga3 AI community on GigaSocial.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GigaSocial post on Giga3 AI",
    description:
      "Watch and read shared posts from the Giga3 AI community on GigaSocial.",
  },
};

export default function GigaSocialPublicPostPage() {
  return (
    <div className="marketing-stable section-padding pt-28">
      <Container>
        <Suspense fallback={<p className="text-center text-muted">Loading post…</p>}>
          <GigaSocialPublicPostRoot />
        </Suspense>
      </Container>
    </div>
  );
}
