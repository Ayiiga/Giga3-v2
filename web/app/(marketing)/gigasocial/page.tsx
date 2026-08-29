import { Container } from "@/components/ui/Container";
import { withChunkRetryLoader } from "@/lib/pwa/dynamicWithChunkRetry";
import { publicMetadata } from "@/lib/seo/publicMetadata";
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

export const metadata = publicMetadata({
  path: "/gigasocial",
  title: "GigaSocial — AI-Powered Community",
  description:
    "GigaSocial by Giga3 AI is an AI-powered community experience for people in Africa to connect, share, learn, and collaborate.",
});

export default function GigaSocialPage() {
  return (
    <div className="gigasocial-page-shell gigasocial-stable gigasocial-premium w-full max-w-full px-3 pb-3 pt-[3.75rem] sm:px-6 sm:pb-6 sm:pt-20">
      <Container className="!px-0">
        <header className="mx-auto mb-8 max-w-3xl rounded-2xl border border-border bg-white p-6 sm:p-8">
          <h1 className="page-title">GigaSocial — Connect, share, and collaborate with AI</h1>
          <p className="mt-4 text-base leading-7 text-muted">
            GigaSocial is Giga3 AI&apos;s community space for sharing ideas, discovering creators,
            and learning together. Sign in to create your profile and join the conversation.
          </p>
        </header>
        <Suspense fallback={<p className="text-center text-muted">Loading GigaSocial…</p>}>
          <GigaSocialPageRoot />
        </Suspense>
      </Container>
    </div>
  );
}
