"use client";

import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import dynamic from "next/dynamic";

const CreatorStudioClient = dynamic(
  () =>
    import("@/components/creator-studio/CreatorStudioClient").then((m) => ({
      default: m.CreatorStudioClient,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

export function CreatorPageRoot() {
  useRenderDiagnostic("CreatorPageRoot");
  return <CreatorStudioClient />;
}
