import type { GigaEditOpenOptions, GigaEditSection } from "@/lib/gigaedit/types";
import { siteConfig } from "@/lib/site";

/**
 * Product scope for the education-first primary nav tabs (Phase 2).
 * Media Studio / GigaEdits are no longer primary destinations.
 */
export const PRIMARY_NAV_PRODUCT_SCOPE = {
  home: "AI Assistant — chat, research, writing, coding, and in-chat images",
  learn: "GigaLearn Academy — courses, tutoring, Technology Learning Hub",
  practice: "Exam Practice — BECE, Teacher Promotion, subject and timed sets",
  social: "GigaSocial feed, stories, and publishing",
  market: "Marketplace — ebooks, learning materials, and digital products",
} as const;

/** Sections that must resolve under GigaEdits — never Media Studio. */
export const GIGAEDIT_CAPTURE_SECTIONS = new Set<GigaEditSection>([
  "teleprompter",
  "audio",
  "video",
]);

export function buildGigaEditSectionHref(
  section: GigaEditSection,
  opts?: Pick<GigaEditOpenOptions, "autoImport" | "record" | "projectId" | "aspect">
): string {
  const base = `${siteConfig.links.gigaedit}/`;
  if (section === "home") return base;
  const params = new URLSearchParams();
  params.set("tab", section);
  if (opts?.autoImport) params.set("import", "1");
  if (opts?.record) params.set("record", "1");
  if (opts?.projectId) params.set("project", opts.projectId);
  if (opts?.aspect) params.set("aspect", opts.aspect);
  return `${base}?${params.toString()}`;
}

/** Canonical deep links for teleprompter and recording (always GigaEdits). */
export const GIGAEDIT_RECORDING_LINKS = {
  teleprompter: buildGigaEditSectionHref("teleprompter"),
  recordVideo: buildGigaEditSectionHref("teleprompter", { record: true }),
  recordVoice: buildGigaEditSectionHref("audio", { record: true }),
  audioStudio: buildGigaEditSectionHref("audio"),
  videoEditorVoiceover: buildGigaEditSectionHref("video"),
} as const;

export function isGigaEditCaptureHref(href: string): boolean {
  const path = href.split("?")[0] ?? "";
  if (!path.includes("/gigaedit")) return false;
  const tab = new URL(href, "https://www.giga3ai.com").searchParams.get("tab");
  return tab === "teleprompter" || tab === "audio" || tab === "video";
}
