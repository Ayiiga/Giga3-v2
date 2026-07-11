"use client";

import { LoadingState } from "@/components/ui/LoadingState";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { dynamicWithChunkRetry } from "@/lib/pwa/dynamicWithChunkRetry";

const GigaSocialClient = dynamicWithChunkRetry(
  () =>
    import("@/components/gigasocial/GigaSocialClient").then((m) => ({
      default: m.GigaSocialClient,
    })),
  { ssr: false, loading: () => <LoadingState label="Loading GigaSocial…" /> }
);

export function GigaSocialPageRoot() {
  useRenderDiagnostic("GigaSocialPageRoot");
  return <GigaSocialClient />;
}
