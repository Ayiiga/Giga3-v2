import {
  BookOpen,
  Camera,
  GraduationCap,
  LayoutGrid,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type GigaLearnSection =
  | "student"
  | "teacher"
  | "parent"
  | "homework"
  | "workspace";

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
    id: "workspace",
    label: "Progress",
    description: "Learning history, achievements, and saved materials",
    icon: LayoutGrid,
  },
];
