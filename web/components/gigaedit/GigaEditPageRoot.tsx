"use client";

import { LoadingState } from "@/components/ui/LoadingState";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import dynamic from "next/dynamic";

const GigaEditClient = dynamic(
  () =>
    import("@/components/gigaedit/GigaEditClient").then((m) => ({
      default: m.GigaEditClient,
    })),
  { ssr: false, loading: () => <LoadingState label="Loading GigaEdit…" /> }
);

export function GigaEditPageRoot() {
  useRenderDiagnostic("GigaEditPageRoot");
  return <GigaEditClient />;
}
