"use client";

/**
 * Requested-path shim: overlay track UI lives in
 * `web/components/gigaedit/MultiTrackTimeline.tsx` (lanes) +
 * `web/components/gigaedit/OverlayInspector.tsx` (selection controls).
 */
export { MultiTrackTimeline as OverlayTrack } from "@/components/gigaedit/MultiTrackTimeline";
export { OverlayInspector } from "@/components/gigaedit/OverlayInspector";
export { OverlayPreviewStack } from "@/components/gigaedit/OverlayPreviewStack";
