import { Container } from "@/components/ui/Container";
import { withChunkRetryLoader } from "@/lib/pwa/dynamicWithChunkRetry";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const GigaSocialPageRoot = dynamic(
  withChunkRetryLoader(() =>
    import("@/components/gigasocial/GigaSocialPageRoot").then((m) => ({
      default: m.GigaSocialPageRoot,
    }))
  ),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

export const metadata: Metadata = {
  title: "GigaSocial",
  description:
    "Giga3 AI GigaSocial — connect, share, learn, and collaborate in an AI-powered community for Africa.",
};

export default function GigaSocialPage() {
  return (
    <div className="gigasocial-stable section-padding pt-28">
      <Container>
        <Suspense fallback={<p className="text-center text-muted">Loading GigaSocial…</p>}>
          <GigaSocialPageRoot />
        </Suspense>
      </Container>
    </div>
  );
}
