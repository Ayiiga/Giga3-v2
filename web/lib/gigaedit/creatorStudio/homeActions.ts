import type { GigaEditSection } from "@/lib/gigaedit/types";

export type CreatorHomeActionId =
  | "new-project"
  | "import-video"
  | "import-images"
  | "record-video"
  | "record-voice"
  | "generate-ai"
  | "recent-projects"
  | "templates"
  | "brand-kit";

export type CreatorHomeActionKind = "section" | "media" | "projects";

export type CreatorHomeAction = {
  id: CreatorHomeActionId;
  label: string;
  emoji: string;
  description: string;
  kind: CreatorHomeActionKind;
  section?: GigaEditSection;
  /** Query flags passed when opening a section. */
  openFlags?: { autoImport?: boolean; record?: boolean };
  featured?: boolean;
};

/** Dashboard quick actions — every entry resolves to a real surface. */
export const CREATOR_HOME_ACTIONS: CreatorHomeAction[] = [
  {
    id: "new-project",
    label: "New Project",
    emoji: "➕",
    description: "Start a blank video timeline",
    kind: "section",
    section: "video",
    featured: true,
  },
  {
    id: "import-video",
    label: "Import Video",
    emoji: "📥",
    description: "Open the video editor and pick files",
    kind: "section",
    section: "video",
    openFlags: { autoImport: true },
    featured: true,
  },
  {
    id: "import-images",
    label: "Import Images",
    emoji: "🖼",
    description: "Edit photos and graphics on-device",
    kind: "section",
    section: "photo",
    openFlags: { autoImport: true },
    featured: true,
  },
  {
    id: "record-video",
    label: "Record Video",
    emoji: "📹",
    description: "Teleprompter + camera recording",
    kind: "section",
    section: "teleprompter",
    openFlags: { record: true },
    featured: true,
  },
  {
    id: "record-voice",
    label: "Record Voice",
    emoji: "🎙",
    description: "Capture voiceover in Audio Studio",
    kind: "section",
    section: "audio",
    openFlags: { record: true },
  },
  {
    id: "generate-ai",
    label: "Generate with AI",
    emoji: "✨",
    description: "Image & video AI in Media Studio",
    kind: "media",
    featured: true,
  },
  {
    id: "recent-projects",
    label: "Open Recent",
    emoji: "📂",
    description: "Browse saved local drafts",
    kind: "section",
    section: "projects",
  },
  {
    id: "templates",
    label: "Templates",
    emoji: "🎨",
    description: "Creator layouts for social formats",
    kind: "section",
    section: "templates",
  },
  {
    id: "brand-kit",
    label: "Brand Kit",
    emoji: "🏷",
    description: "Logos, colors, fonts & watermark",
    kind: "section",
    section: "brand",
  },
];

export function featuredCreatorHomeActions(): CreatorHomeAction[] {
  return CREATOR_HOME_ACTIONS.filter((a) => a.featured);
}
