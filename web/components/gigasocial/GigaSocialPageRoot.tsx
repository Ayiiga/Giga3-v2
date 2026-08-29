"use client";

import { LoadingState } from "@/components/ui/LoadingState";
import { withChunkRetryLoader } from "@/lib/pwa/dynamicWithChunkRetry";
import dynamic from "next/dynamic";
import { GigaSocialShellBoundary } from "@/components/gigasocial/GigaSocialShellBoundary";

const GigaSocialClient = dynamic(
  withChunkRetryLoader(() =>
    import("@/components/gigasocial/GigaSocialClient").then((m) => ({
      default: m.GigaSocialClient,
    }))
  ),
  { ssr: false, loading: () => <LoadingState label="Loading GigaSocial…" /> }
);

export function GigaSocialPageRoot() {
  return (
    <GigaSocialShellBoundary>
      <GigaSocialClient />
    </GigaSocialShellBoundary>
  );
}
