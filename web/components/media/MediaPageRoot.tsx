"use client";

import { MediaStudioClient } from "@/components/media/MediaStudioClient";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";

/** Client entry for /media — render diagnostics attach here. */
export function MediaPageRoot() {
  useRenderDiagnostic("MediaPage");
  return <MediaStudioClient />;
}
