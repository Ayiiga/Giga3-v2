import { Container } from "@/components/ui/Container";
import { withChunkRetryLoader } from "@/lib/pwa/dynamicWithChunkRetry";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const GigaEditPageRoot = dynamic(
  withChunkRetryLoader(() =>
    import("@/components/gigaedit/GigaEditPageRoot").then((m) => ({
      default: m.GigaEditPageRoot,
    }))
  ),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

export const metadata: Metadata = {
  title: "GigaEdit",
  description:
    "GigaEdit — AI-powered creator studio for video, photo, teleprompter, templates, and offline creative tools on Giga3 AI.",
};

export default function GigaEditPage() {
  return (
    <div className="gigaedit-page px-0 pb-3 pt-[3.75rem] sm:px-3 sm:pb-6 sm:pt-20">
      <Container className="!px-0 sm:!px-4">
        <Suspense fallback={<p className="text-center text-muted">Loading GigaEdit…</p>}>
          <GigaEditPageRoot />
        </Suspense>
      </Container>
    </div>
  );
}
