import type { AiModeId } from "@/lib/aiRouter";

/** User-facing chat categories — map to existing Convex AI modes (no schema changes). */
export type ChatCategoryId =
  | "education"
  | "research"
  | "writing"
  | "coding"
  | "creativity"
  | "general";

export interface ChatCategoryDefinition {
  id: ChatCategoryId;
  label: string;
  emoji: string;
  description: string;
  /** Convex AI mode activated when this category is selected. */
  mode: AiModeId;
}

export const CHAT_CATEGORIES: ChatCategoryDefinition[] = [
  {
    id: "general",
    label: "General",
    emoji: "🌍",
    description: "Everyday questions and assistance",
    mode: "general",
  },
  {
    id: "education",
    label: "Learn",
    emoji: "🎓",
    description: "Lessons, homework, and exam prep",
    mode: "gigalearn",
  },
  {
    id: "research",
    label: "Research",
    emoji: "🔎",
    description: "Web-backed answers with sources",
    mode: "research",
  },
  {
    id: "writing",
    label: "Writing",
    emoji: "✍️",
    description: "Essays, stories, and documents",
    mode: "book",
  },
  {
    id: "coding",
    label: "Code",
    emoji: "💻",
    description: "Write, debug, and explain code",
    mode: "coding",
  },
  {
    id: "creativity",
    label: "Create",
    emoji: "🎨",
    description: "Images, posts, and creative projects",
    mode: "social",
  },
];

export function getCategoryForMode(mode: AiModeId): ChatCategoryDefinition {
  return (
    CHAT_CATEGORIES.find((c) => c.mode === mode) ??
    CHAT_CATEGORIES.find((c) => {
      if (mode === "homework" || mode === "waec") {
        return c.id === "education";
      }
      if (mode === "research" || mode === "news") return c.id === "research";
      if (mode === "university" || mode === "book") return c.id === "writing";
      if (mode === "resume") return c.id === "writing";
      return false;
    }) ??
    CHAT_CATEGORIES[0]
  );
}

export function getCategoryById(id: ChatCategoryId): ChatCategoryDefinition {
  return CHAT_CATEGORIES.find((c) => c.id === id) ?? CHAT_CATEGORIES[0];
}

export function modeForCategory(id: ChatCategoryId): AiModeId {
  return getCategoryById(id).mode;
}
