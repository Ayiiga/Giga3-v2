import type { LucideIcon } from "lucide-react";
import {
  BookMarked,
  Brain,
  ClipboardList,
  FileQuestion,
  FileText,
  GraduationCap,
  HeartHandshake,
  Lightbulb,
  ListChecks,
  NotebookPen,
  ScrollText,
  Sparkles,
  Target,
} from "lucide-react";
import type { GigaLearnSection } from "@/lib/gigalearn/sections";

export type GigaLearnToolSection = Exclude<GigaLearnSection, "homework" | "workspace">;

export interface GigaLearnToolDefinition {
  id: string;
  section: GigaLearnToolSection;
  label: string;
  description: string;
  icon: LucideIcon;
  placeholder: string;
  creditCost: number;
}

export const STUDENT_TOOLS: GigaLearnToolDefinition[] = [
  {
    id: "topic-explainer",
    section: "student",
    label: "Topic explainer",
    description: "Understand difficult topics simply",
    icon: Lightbulb,
    placeholder: "What topic do you want explained? (e.g. quadratic equations, photosynthesis)…",
    creditCost: 2,
  },
  {
    id: "quiz-generator",
    section: "student",
    label: "Quiz generator",
    description: "Practice quizzes with answer key",
    icon: FileQuestion,
    placeholder: "Subject, topic, and number of questions (e.g. 10 BECE maths questions on algebra)…",
    creditCost: 2,
  },
  {
    id: "study-plan",
    section: "student",
    label: "Study plan",
    description: "Personalized revision schedule",
    icon: ListChecks,
    placeholder: "Exam date, subjects, and hours available per week…",
    creditCost: 2,
  },
  {
    id: "practice-questions",
    section: "student",
    label: "Practice questions",
    description: "Exam-style questions with solutions",
    icon: Target,
    placeholder: "Curriculum, subject, and topics to practice…",
    creditCost: 2,
  },
  {
    id: "exam-prep",
    section: "student",
    label: "Exam prep",
    description: "Focused WASSCE / BECE revision pack",
    icon: GraduationCap,
    placeholder: "Which exam and subject? (e.g. WASSCE Core Maths Paper 2 topics)…",
    creditCost: 2,
  },
  {
    id: "revision-guide",
    section: "student",
    label: "Revision guide",
    description: "Key facts, tips, and self-tests",
    icon: BookMarked,
    placeholder: "Subject and topics to revise before the exam…",
    creditCost: 2,
  },
  {
    id: "homework-explain",
    section: "student",
    label: "Homework help",
    description: "Step-by-step problem solving",
    icon: Brain,
    placeholder: "Paste or describe the homework question…",
    creditCost: 2,
  },
];

export const TEACHER_TOOLS: GigaLearnToolDefinition[] = [
  {
    id: "lesson-notes",
    section: "teacher",
    label: "Lesson notes",
    description: "Structured notes with objectives and examples",
    icon: NotebookPen,
    placeholder: "Class level, subject, topic, and lesson duration…",
    creditCost: 2,
  },
  {
    id: "worksheet-generator",
    section: "teacher",
    label: "Worksheet",
    description: "Printable exercises with answer key",
    icon: ScrollText,
    placeholder: "Class, subject, topic, and difficulty level…",
    creditCost: 2,
  },
  {
    id: "assignment-generator",
    section: "teacher",
    label: "Assignment",
    description: "Tasks with marking criteria",
    icon: ClipboardList,
    placeholder: "Class, subject, assignment type, and due expectations…",
    creditCost: 2,
  },
  {
    id: "class-activity",
    section: "teacher",
    label: "Class activity",
    description: "Engaging in-class exercises",
    icon: Sparkles,
    placeholder: "Subject, topic, class size, and available materials…",
    creditCost: 2,
  },
  {
    id: "quiz-generator",
    section: "teacher",
    label: "Class quiz",
    description: "Quick assessments for your class",
    icon: FileQuestion,
    placeholder: "Class level, subject, topic, and number of questions…",
    creditCost: 2,
  },
];

export const PARENT_TOOLS: GigaLearnToolDefinition[] = [
  {
    id: "parent-summary",
    section: "parent",
    label: "Topic summary",
    description: "What your child is learning — in plain language",
    icon: FileText,
    placeholder: "Your child's class level and the topic they are studying…",
    creditCost: 2,
  },
  {
    id: "learning-tips",
    section: "parent",
    label: "Learning tips",
    description: "How to support study at home",
    icon: HeartHandshake,
    placeholder: "Child's age, subject, and any challenges (e.g. maths anxiety)…",
    creditCost: 2,
  },
  {
    id: "progress-report",
    section: "parent",
    label: "Progress template",
    description: "Strengths, gaps, and next steps",
    icon: ListChecks,
    placeholder: "Subject, recent performance, and areas of concern…",
    creditCost: 2,
  },
  {
    id: "homework-explain",
    section: "parent",
    label: "Homework guide",
    description: "Understand homework to help your child",
    icon: Brain,
    placeholder: "Paste the homework question or describe what they're stuck on…",
    creditCost: 2,
  },
];

export const ALL_GIGALEARN_TOOLS = [
  ...STUDENT_TOOLS,
  ...TEACHER_TOOLS,
  ...PARENT_TOOLS,
];

export function getGigaLearnTool(id: string): GigaLearnToolDefinition | undefined {
  return ALL_GIGALEARN_TOOLS.find((t) => t.id === id);
}

export function toolsForSection(
  section: GigaLearnToolSection
): GigaLearnToolDefinition[] {
  return ALL_GIGALEARN_TOOLS.filter((t) => t.section === section);
}
