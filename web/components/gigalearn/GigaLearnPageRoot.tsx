"use client";

import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import dynamic from "next/dynamic";

const GigaLearnClient = dynamic(
  () =>
    import("@/components/gigalearn/GigaLearnClient").then((m) => ({
      default: m.GigaLearnClient,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

export function GigaLearnPageRoot() {
  useRenderDiagnostic("GigaLearnPageRoot");
  return <GigaLearnClient />;
}
