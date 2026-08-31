import { siteConfig } from "@/lib/site";
import type { LucideIcon } from "lucide-react";
import { BookOpen, Clapperboard, Sparkles, UsersRound } from "lucide-react";

export type ChatWorkspaceApp = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  gradient: string;
  badge: string;
  hint: string;
};

/** Primary chat workspace apps — order is product-facing navigation priority. */
export const CHAT_WORKSPACE_PRIMARY_APPS: ChatWorkspaceApp[] = [
  {
    id: "gigasocial",
    label: "GigaSocial",
    href: siteConfig.links.gigasocial,
    icon: UsersRound,
    gradient: "from-sky-500 to-emerald-500",
    badge: "Social",
    hint: "Feed, stories, and creator tools — open the social hub.",
  },
  {
    id: "gigaedit",
    label: "GigaEdits",
    href: `${siteConfig.links.gigaedit}/`,
    icon: Clapperboard,
    gradient: "from-amber-500 to-orange-600",
    badge: "Edit",
    hint: "CapCut-style studio — video, photo, teleprompter, and offline edits.",
  },
  {
    id: "gigalearn",
    label: "GigaLearn",
    href: `${siteConfig.links.gigalearn}/`,
    icon: BookOpen,
    gradient: "from-violet-600 to-indigo-600",
    badge: "Learn",
    hint: "AI learning studio — homework help, quizzes, lesson notes, and study plans.",
  },
  {
    id: "media-studio",
    label: "Media Studio",
    href: siteConfig.links.media,
    icon: Sparkles,
    gradient: "from-fuchsia-500 to-violet-600",
    badge: "Create",
    hint: "Generate and edit images and video — templates, 4K, and creator modes.",
  },
];
