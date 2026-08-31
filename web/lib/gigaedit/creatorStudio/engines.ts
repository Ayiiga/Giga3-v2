/**
 * Creator Studio engine registry — modular boundaries for incremental extraction.
 * Engines map to existing or planned surfaces; unavailable engines stay hidden.
 */

export type CreatorStudioEngineId =
  | "EditorShell"
  | "PreviewEngine"
  | "TimelineEngine"
  | "MediaLibrary"
  | "AudioEngine"
  | "TextEngine"
  | "CaptionEngine"
  | "EffectsEngine"
  | "AIEngine"
  | "BrandEngine"
  | "StoryEngine"
  | "CollaborationEngine"
  | "ExportEngine"
  | "PublishEngine"
  | "ProjectManager"
  | "CreatorAnalytics";

export type CreatorStudioEngine = {
  id: CreatorStudioEngineId;
  label: string;
  description: string;
  /** Existing component or lib path that implements this today. */
  implementation: string;
  status: "active" | "partial" | "planned";
};

export const CREATOR_STUDIO_ENGINES: CreatorStudioEngine[] = [
  {
    id: "EditorShell",
    label: "Editor Shell",
    description: "Routing, layout, and section navigation.",
    implementation: "web/components/gigaedit/EditorShell.tsx",
    status: "active",
  },
  {
    id: "PreviewEngine",
    label: "Preview",
    description: "Canvas/video preview with filters and aspect crop.",
    implementation: "web/components/gigaedit/CameraStylePreview.tsx",
    status: "active",
  },
  {
    id: "TimelineEngine",
    label: "Timeline",
    description: "Clip trim, split, join (up to 10), playhead.",
    implementation: "web/components/gigaedit/VideoEditor.tsx",
    status: "partial",
  },
  {
    id: "MediaLibrary",
    label: "Media Library",
    description: "Project blobs in IndexedDB; clip source map.",
    implementation: "web/lib/gigaedit/projects.ts",
    status: "partial",
  },
  {
    id: "AudioEngine",
    label: "Audio",
    description: "Record, attach voiceover, sound library.",
    implementation: "web/components/gigaedit/AudioStudio.tsx",
    status: "active",
  },
  {
    id: "TextEngine",
    label: "Text",
    description: "Overlay text on video/photo.",
    implementation: "web/components/gigaedit/VideoEditor.tsx",
    status: "partial",
  },
  {
    id: "CaptionEngine",
    label: "Captions",
    description: "Browser STT draft or manual captions; baked on export.",
    implementation: "web/components/gigaedit/VideoEditor.tsx",
    status: "partial",
  },
  {
    id: "EffectsEngine",
    label: "Effects",
    description: "Camera filters, brightness/contrast on photo.",
    implementation: "web/lib/gigasocial/cameraFilters.ts",
    status: "partial",
  },
  {
    id: "AIEngine",
    label: "AI Assist",
    description: "Local drafts + Chat/Media Studio handoffs.",
    implementation: "web/lib/gigaedit/aiAssist.ts",
    status: "partial",
  },
  {
    id: "BrandEngine",
    label: "Brand Kit",
    description: "Local brand colors, logo, fonts, watermark.",
    implementation: "web/lib/gigaedit/creatorStudio/brandKit.ts",
    status: "active",
  },
  {
    id: "StoryEngine",
    label: "AI Story",
    description: "Structured edit suggestions (planned).",
    implementation: "web/lib/gigaedit/aiAssist.ts",
    status: "planned",
  },
  {
    id: "CollaborationEngine",
    label: "Collaboration",
    description: "Roles/comments foundation (planned).",
    implementation: "web/lib/gigaedit/projects.ts",
    status: "planned",
  },
  {
    id: "ExportEngine",
    label: "Export",
    description: "Canvas + MediaRecorder export with device tier caps.",
    implementation: "web/lib/gigaedit/videoExport.ts",
    status: "active",
  },
  {
    id: "PublishEngine",
    label: "Publish",
    description: "Handoff to GigaSocial composer.",
    implementation: "web/lib/gigaedit/publishHandoff.ts",
    status: "active",
  },
  {
    id: "ProjectManager",
    label: "Projects",
    description: "Local CRUD, duplicate, JSON export.",
    implementation: "web/components/gigaedit/ProjectManager.tsx",
    status: "active",
  },
  {
    id: "CreatorAnalytics",
    label: "Analytics",
    description: "Export/publish metrics (planned).",
    implementation: "—",
    status: "planned",
  },
];

export function activeEngines(): CreatorStudioEngine[] {
  return CREATOR_STUDIO_ENGINES.filter((e) => e.status === "active");
}
