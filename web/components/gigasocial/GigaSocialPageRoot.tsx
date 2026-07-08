"use client";

import { LoadingState } from "@/components/ui/LoadingState";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import dynamic from "next/dynamic";

const GigaSocialClient = dynamic(
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
