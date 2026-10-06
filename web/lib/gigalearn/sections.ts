import {
  BarChart3,
  BookOpen,
  GraduationCap,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Six primary GigaLearn experiences — top-level navigation only. */
export type GigaLearnPrimaryArea =
  | "student"
  | "teacher"
  | "create"
  | "parent"
  | "insight"
  | "tutor";

/** @deprecated Legacy tab ids — use resolvePrimaryArea() instead. Kept for type compatibility. */
export type GigaLearnSection =
  | GigaLearnPrimaryArea
  | "homework"
  | "rhymes"
  | "workspace"
  | "studio"
  | "learn"
  | "library"
  | "my-learning"
  | "revision"
  | "insights";

export interface GigaLearnAreaDefinition {
  id: GigaLearnPrimaryArea;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const GIGALEARN_PRIMARY_AREAS: GigaLearnAreaDefinition[] = [
  {
    id: "student",
    label: "Student",
    description: "Learn, practise, revise and prepare for exams",
    icon: GraduationCap,
  },
  {
    id: "teacher",
    label: "Teacher",
    description: "Plan lessons, resources, assessments and classroom activities",
    icon: BookOpen,
  },
  {
    id: "create",
    label: "Create",
    description: "Generate lessons, quizzes, worksheets, rhymes and more",
    icon: Sparkles,
  },
  {
    id: "parent",
    label: "Parent",
    description: "Support your child's learning at home",
    icon: Users,
  },
  {
    id: "insight",
    label: "Insight",
    description: "Progress, mastery and areas needing support",
    icon: BarChart3,
  },
  {
    id: "tutor",
    label: "AI Tutor",
    description: "Ask, explain, practise and get step-by-step help",
    icon: MessageCircle,
  },
];

/** @deprecated Use GIGALEARN_PRIMARY_AREAS — legacy export for tests and imports. */
export const GIGALEARN_SECTIONS = GIGALEARN_PRIMARY_AREAS.map((a) => ({
  ...a,
  id: a.id as GigaLearnSection,
}));
