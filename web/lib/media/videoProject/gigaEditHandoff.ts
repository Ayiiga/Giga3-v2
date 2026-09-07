import type { VideoProject } from "@/lib/media/videoProject/types";
import type { ExportAspectRatio } from "@/lib/gigaedit/types";

export type GigaEditHandoffPayload = {
  /** Query params for /gigaedit — project import handled client-side on mount. */
  importUrls: string[];
  aspect: ExportAspectRatio;
  title: string;
  overlayText?: string;
  aiAssisted: true;
  aiVisualizationLabel?: string;
};

export function buildGigaEditHandoff(project: VideoProject): GigaEditHandoffPayload {
  const urls = [...project.scenes]
    .sort((a, b) => a.order - b.order)
    .map((s) => s.outputUrl)
    .filter((u): u is string => Boolean(u));

  const titleOverlay = project.textOverlays.find((o) => o.kind === "title" && o.text.trim());
  const labelOverlay = project.consistency.aiVisualizationLabel
    ? project.textOverlays.find((o) => o.text.toLowerCase().includes("ai-generated"))
    : undefined;

  return {
    importUrls: urls,
    aspect: project.settings.aspectRatio as ExportAspectRatio,
    title: project.title,
    overlayText: titleOverlay?.text,
    aiAssisted: true,
    aiVisualizationLabel: labelOverlay?.text,
  };
}

export function gigaEditHandoffSearchParams(payload: GigaEditHandoffPayload): string {
  const params = new URLSearchParams();
  params.set("tab", "video");
  params.set("aspect", payload.aspect);
  params.set("title", payload.title.slice(0, 120));
  params.set("aiAssisted", "1");
  if (payload.overlayText) params.set("overlayText", payload.overlayText.slice(0, 200));
  payload.importUrls.slice(0, MAX_GIGAEDIT_IMPORT_URLS).forEach((url, i) => {
    params.set(`clip${i}`, url);
  });
  return params.toString();
}

export const MAX_GIGAEDIT_IMPORT_URLS = 8;

export function gigaEditHandoffHref(project: VideoProject): string {
  const payload = buildGigaEditHandoff(project);
  return `/gigaedit/?${gigaEditHandoffSearchParams(payload)}`;
}
