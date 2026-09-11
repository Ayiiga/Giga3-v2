"use client";

import { GigaEditShellBoundary } from "@/components/gigaedit/GigaEditShellBoundary";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { withChunkRetryLoader } from "@/lib/pwa/dynamicWithChunkRetry";
import dynamic from "next/dynamic";

const GigaEditClient = dynamic(
  withChunkRetryLoader(() =>
    import("@/components/gigaedit/GigaEditClient").then((m) => ({
      default: m.GigaEditClient,
    }))
  ),
  { ssr: false, loading: () => <ClientAppHydrationNotice productName="GigaEdit" /> }
);

export function GigaEditPageRoot() {
  useRenderDiagnostic("GigaEditPageRoot");
  return (
    <GigaEditShellBoundary>
      <ConvexAppShell>
        <GigaEditClient />
      </ConvexAppShell>
    </GigaEditShellBoundary>
  );
}
