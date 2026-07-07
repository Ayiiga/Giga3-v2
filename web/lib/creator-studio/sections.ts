import { LayoutGrid, ImageIcon, PenLine, Share2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type CreatorStudioSection = "writing" | "image" | "social" | "workspace";

export interface CreatorSectionDefinition {
  id: CreatorStudioSection;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const CREATOR_SECTIONS: CreatorSectionDefinition[] = [
  {
    id: "writing",
    label: "Writing",
    description: "Captions, posts, blogs, stories, speeches, emails, CVs",
    icon: PenLine,
  },
  {
    id: "image",
    label: "Images",
    description: "Posters, logos, social graphics, educational visuals",
    icon: ImageIcon,
  },
  {
    id: "social",
    label: "Social",
    description: "Hooks, hashtags, viral captions, post rewrites",
    icon: Share2,
  },
  {
    id: "workspace",
    label: "Workspace",
    description: "Saved creations, favorites, and history",
    icon: LayoutGrid,
  },
];
