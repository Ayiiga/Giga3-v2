import { siteConfig } from "@/lib/site";
import type { LucideIcon } from "lucide-react";
import { BookOpen, ClipboardList, Cpu, Newspaper, UsersRound } from "lucide-react";

export type ChatWorkspaceApp = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  gradient: string;
  badge: string;
  hint: string;
};

/** Primary chat workspace apps — education-first order (Phase 2). */
export const CHAT_WORKSPACE_PRIMARY_APPS: ChatWorkspaceApp[] = [
  {
    id: "gigalearn",
    label: "GigaLearn Academy",
    href: siteConfig.links.gigalearnAcademy,
    icon: BookOpen,
    gradient: "from-violet-600 to-indigo-600",
    badge: "Learn",
    hint: "Courses, enrolments, tutoring, assessments, and certificates.",
  },
  {
    id: "exam-practice",
    label: "Exam Practice",
    href: siteConfig.links.gigalearnExam,
    icon: ClipboardList,
    gradient: "from-amber-500 to-orange-600",
    badge: "Practice",
    hint: "BECE, Teacher Promotion, subject practice, and timed sets.",
  },
  {
    id: "tech-hub",
    label: "Technology Hub",
    href: "/gigalearn/academy/tech/",
    icon: Cpu,
    gradient: "from-fuchsia-500 to-violet-600",
    badge: "Tech",
    hint: "Interactive technology learning banks inside Academy.",
  },
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
    id: "blog",
    label: "Giga3 Blog",
    href: `${siteConfig.links.blog}/`,
    icon: Newspaper,
    gradient: "from-blue-600 to-indigo-700",
    badge: "Read",
    hint: "Guides on AI, education and Ghana.",
  },
];
