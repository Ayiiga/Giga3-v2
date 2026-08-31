/**
 * GigaEdits Creator Studio — phased implementation plan.
 * Each phase builds on existing GigaEdit infrastructure; no duplicate backends.
 */

export type CreatorStudioPhase = {
  id: string;
  title: string;
  summary: string;
  items: string[];
  status: "done" | "in_progress" | "planned";
};

/** Living roadmap — update status as slices ship. */
export const CREATOR_STUDIO_PHASES: CreatorStudioPhase[] = [
  {
    id: "phase-0",
    title: "Inspect & scaffold",
    summary: "Map existing gigaedit modules; add Creator Studio shell without removing working editors.",
    items: [
      "Engine registry (EditorShell, TimelineEngine, ExportEngine, …)",
      "Creator Home dashboard with honest quick actions",
      "Recent projects grid (thumbnail, duration, resolution, status)",
      "Local Brand Kit (IndexedDB)",
      "Project summary helpers + duration metadata on save",
    ],
    status: "in_progress",
  },
  {
    id: "phase-1",
    title: "Solidify local core",
    summary: "Export reliability, project versions, template assets, E2E import→export→publish.",
    items: [
      "Export queue with real MediaRecorder progress",
      "Project version snapshots (restore previous)",
      "Template layouts applied to timeline placeholders",
      "Cloud backup replacing offline.ts stub (Convex storage)",
    ],
    status: "planned",
  },
  {
    id: "phase-2",
    title: "Auth, credits & Media Studio return",
    summary: "Credit banner for paid AI; deep-link results back into timeline.",
    items: [
      "Credit estimate before cloud AI operations",
      "Media Studio → GigaEdit insert handoff",
      "Optional login for cloud project sync",
    ],
    status: "planned",
  },
  {
    id: "phase-3",
    title: "Real AI on media",
    summary: "One feature at a time; suggestions labeled; Apply / Preview / Undo.",
    items: [
      "Cloud captions (Convex STT when configured)",
      "AI Story Editor & Auto Edit suggestions",
      "Script Studio → timeline placeholders",
      "Clip generator / smart reframe (provider-dependent)",
    ],
    status: "planned",
  },
  {
    id: "phase-4",
    title: "Studio convergence",
    summary: "Multi-track timeline v2, transitions, motion, color studio — after export is solid.",
    items: [
      "TimelineEngine v2 (audio/text/caption tracks UI)",
      "Transition & motion studios wired to render pipeline",
      "Smart Format (multi-aspect from master project)",
      "GigaSocial publish integration (existing handoff)",
    ],
    status: "planned",
  },
  {
    id: "phase-5",
    title: "Advanced creator workflow",
    summary: "Collaboration foundation, beat sync, analytics — only when backend exists.",
    items: [
      "Collaboration roles data model (no fake realtime)",
      "Beat sync when audio analysis available",
      "Creator analytics when export/publish telemetry exists",
    ],
    status: "planned",
  },
];

export const CREATOR_STUDIO_PRODUCT_NAME = "GigaEdits Creator Studio";
