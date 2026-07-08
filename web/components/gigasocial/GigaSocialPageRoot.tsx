"use client";

import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import dynamic from "next/dynamic";

const GigaSocialClient = dynamic(
  () =>
    import("@/components/gigasocial/GigaSocialClient").then((m) => ({
      default: m.GigaSocialClient,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

export function GigaSocialPageRoot() {
  useRenderDiagnostic("GigaSocialPageRoot");
  return <GigaSocialClient />;
}
