"use client";

import { LoadingState } from "@/components/ui/LoadingState";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { withChunkRetryLoader } from "@/lib/pwa/dynamicWithChunkRetry";
import dynamic from "next/dynamic";

const GigaSocialClient = dynamic(
  withChunkRetryLoader(() =>
    import("@/components/gigasocial/GigaSocialClient").then((m) => ({
      default: m.GigaSocialClient,
    }))
  ),
  { ssr: false, loading: () => <LoadingState label="Loading GigaSocial…" /> }
);

export function GigaSocialPageRoot() {
  useRenderDiagnostic("GigaSocialPageRoot");
  return <GigaSocialClient />;
}
