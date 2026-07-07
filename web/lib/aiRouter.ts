import { getSystemPrompt, AI_MODES, isValidMode, type AiModeId } from "../../convex/aiModes";

/** Keep mode ids in sync with convex/aiModes.ts */
export { AI_MODES, isValidMode, type AiModeId };

export interface AiModeDefinition {
  id: AiModeId;
  label: string;
  description: string;
  icon: string;
  systemPrompt: string;
}

export const AI_MODE_DEFINITIONS: AiModeDefinition[] = [
  {
    id: "general",
    label: "General Chat",
    description: "Everyday questions and conversation",
    icon: "MessageCircle",
    systemPrompt: getSystemPrompt("general"),
  },
  {
    id: "coding",
    label: "Coding Assistant",
    description: "Code, debug, and architecture help",
    icon: "Code2",
    systemPrompt: getSystemPrompt("coding"),
  },
  {
    id: "homework",
    label: "Homework Solver",
    description: "Step-by-step learning support",
    icon: "GraduationCap",
    systemPrompt: getSystemPrompt("homework"),
  },
  {
    id: "waec",
    label: "WAEC Practice",
    description: "Exam prep for WAEC students",
    icon: "BookOpen",
    systemPrompt: getSystemPrompt("waec"),
  },
  {
    id: "university",
    label: "University Q&A",
    description: "Academic and study support",
    icon: "School",
    systemPrompt: getSystemPrompt("university"),
  },
  {
    id: "research",
    label: "Research Assistant",
    description: "Structure and analyze research",
    icon: "Search",
    systemPrompt: getSystemPrompt("research"),
  },
  {
    id: "resume",
    label: "Resume Builder",
    description: "CVs, cover letters, interviews",
    icon: "FileText",
    systemPrompt: getSystemPrompt("resume"),
  },
  {
    id: "book",
    label: "Book Writer",
    description: "Stories, outlines, and chapters",
    icon: "PenLine",
    systemPrompt: getSystemPrompt("book"),
  },
  {
    id: "social",
    label: "Social Media Creator",
    description: "Posts, hooks, and calendars",
    icon: "Share2",
    systemPrompt: getSystemPrompt("social"),
  },
  {
    id: "news",
    label: "News Analysis",
    description: "Latest headlines, fact-checks, and source verification",
    icon: "Newspaper",
    systemPrompt: getSystemPrompt("news"),
  },
  {
    id: "gigalearn",
    label: "GigaLearn",
    description: "Education, quizzes, and homework help",
    icon: "BookMarked",
    systemPrompt: getSystemPrompt("gigalearn"),
  },
];

export function getModeDefinition(mode: string): AiModeDefinition {
  return (
    AI_MODE_DEFINITIONS.find((m) => m.id === mode) ?? AI_MODE_DEFINITIONS[0]
  );
}
