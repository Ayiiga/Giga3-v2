import type { AiModeId } from "@/lib/aiRouter";

/** User-facing chat categories — map to existing Convex AI modes (no schema changes). */
export type ChatCategoryId =
  | "education"
  | "business"
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
    id: "education",
    label: "Education",
    emoji: "📚",
    description: "Learning, homework, and exam prep",
    mode: "gigalearn",
  },
  {
    id: "business",
    label: "Business",
    emoji: "💼",
    description: "Plans, proposals, and professional tasks",
    mode: "resume",
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
    label: "Coding",
    emoji: "💻",
    description: "Code, debug, and architecture",
    mode: "coding",
  },
  {
    id: "creativity",
    label: "Creativity",
    emoji: "🎨",
    description: "Ideas, content, and creative projects",
    mode: "social",
  },
  {
    id: "general",
    label: "General",
    emoji: "🌍",
    description: "Everyday questions and assistance",
    mode: "general",
  },
];

export function getCategoryForMode(mode: AiModeId): ChatCategoryDefinition {
  return (
    CHAT_CATEGORIES.find((c) => c.mode === mode) ??
    CHAT_CATEGORIES.find((c) => {
      if (mode === "homework" || mode === "waec" || mode === "university") {
        return c.id === "education";
      }
      if (mode === "research") return c.id === "general";
      if (mode === "news") return c.id === "general";
      return false;
    }) ??
    CHAT_CATEGORIES[CHAT_CATEGORIES.length - 1]
  );
}

export function getCategoryById(id: ChatCategoryId): ChatCategoryDefinition {
  return CHAT_CATEGORIES.find((c) => c.id === id) ?? CHAT_CATEGORIES[5];
}

export function modeForCategory(id: ChatCategoryId): AiModeId {
  return getCategoryById(id).mode;
}
