import type { AiModeId } from "@/lib/aiRouter";

/**
 * Home quick actions — first-screen shortcuts into existing Giga3 workflows.
 * Actions only switch the existing AI mode (plus an optional starter prompt
 * inserted into the composer, never auto-sent). No duplicate apps or modes.
 */
export type HomeQuickActionId = "learn" | "research" | "create" | "code";

export interface HomeQuickAction {
  id: HomeQuickActionId;
  label: string;
  emoji: string;
  description: string;
  /** Existing Convex AI mode activated by this action. */
  mode: AiModeId;
}

export const HOME_QUICK_ACTIONS: HomeQuickAction[] = [
  {
    id: "learn",
    label: "Learn",
    emoji: "🎓",
    description: "Lessons, homework and exam prep",
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
    id: "create",
    label: "Create",
    emoji: "🎨",
    description: "Images, posts and creative work",
    mode: "social",
  },
  {
    id: "code",
    label: "Code",
    emoji: "💻",
    description: "Write, debug and explain code",
    mode: "coding",
  },
];

export function modeForQuickAction(id: HomeQuickActionId): AiModeId {
  return HOME_QUICK_ACTIONS.find((a) => a.id === id)?.mode ?? "general";
}
