import type { RecommendationItem } from "@/lib/recommendations/fallbackRecs";
import type { GigaPersonaId } from "@/lib/personas/gigaPersonas";

export function applyRecommendationAction(args: {
  item: RecommendationItem;
  onApplyPrompt?: (prompt: string) => void;
  onSelectPersona?: (personaId: GigaPersonaId) => void;
}): void {
  const { item } = args;
  if (item.action.startsWith("persona:")) {
    const personaId = item.action.slice("persona:".length) as GigaPersonaId;
    args.onSelectPersona?.(personaId);
    if (item.prompt) args.onApplyPrompt?.(item.prompt);
    return;
  }
  if (item.action.startsWith("/")) {
    if (typeof window !== "undefined") {
      window.location.href = item.action;
    }
    return;
  }
  if (item.action === "chat:send" && item.prompt) {
    args.onApplyPrompt?.(item.prompt);
  }
}
