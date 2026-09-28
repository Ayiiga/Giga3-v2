import {
  BarChart3,
  BookOpen,
  Briefcase,
  Camera,
  GraduationCap,
  LayoutGrid,
  Library,
  MessageCircle,
  Music,
  Compass,
  RotateCcw,
  Sparkles,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type GigaLearnSection =
  | "student"
  | "teacher"
  | "parent"
  | "homework"
  | "create"
  | "rhymes"
  | "workspace"
  | "studio"
  | "learn"
  | "library"
  | "tutor"
  | "my-learning"
  | "revision"
  | "insights";

export interface GigaLearnSectionDefinition {
  id: GigaLearnSection;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const GIGALEARN_SECTIONS: GigaLearnSectionDefinition[] = [
  {
    id: "student",
    label: "Student",
    description: "Quizzes, study plans, topic explainers, and exam prep",
    icon: GraduationCap,
  },
  {
    id: "teacher",
    label: "Teacher",
    description: "Lesson notes, worksheets, class activities, and assignments",
    icon: BookOpen,
  },
  {
    id: "parent",
    label: "Parent",
    description: "Learning summaries, tips, and how to support at home",
    icon: Users,
  },
  {
    id: "homework",
    label: "Homework",
    description: "Photo homework solving with AI vision in chat",
    icon: Camera,
  },
  {
    id: "create",
    label: "Create",
    description: "Guided lesson plans, research, books, CVs, quizzes and rhymes",
    icon: Sparkles,
  },
  {
    id: "rhymes",
    label: "GigaRhymes",
    description: "Original African-centred learning rhymes to hear, repeat and clap along",
    icon: Music,
  },
  {
    id: "workspace",
    label: "Progress",
    description: "Learning history, achievements, and saved materials",
    icon: LayoutGrid,
  },
  {
    id: "studio",
    label: "Teacher Studio",
    description: "Lesson, quiz, assignment and presentation generation with repurposing",
    icon: Briefcase,
  },
  {
    id: "learn",
    label: "Learn Mode",
    description: "Explain, simplify, examples, practice, quiz and revision for your topic",
    icon: Sparkles,
  },
  {
    id: "library",
    label: "Library",
    description: "Searchable resource library with analytics",
    icon: Library,
  },
  {
    id: "tutor",
    label: "AI Tutor",
    description: "Adaptive tutor with Socratic mode, grounded in your curriculum",
    icon: MessageCircle,
  },
  {
    id: "my-learning",
    label: "My Learning",
    description: "Your adaptive path, progress by subject and next activity",
    icon: Compass,
  },
  {
    id: "revision",
    label: "Revision",
    description: "Review now, practice again and spaced flashcard review",
    icon: RotateCcw,
  },
  {
    id: "insights",
    label: "Insights",
    description: "Teacher insights from your own classroom activity",
    icon: BarChart3,
  },
];
