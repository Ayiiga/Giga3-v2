"use client";

import { useRecommendations } from "@/hooks/useRecommendations";
import { applyRecommendationAction } from "@/lib/recommendations/applyRecommendation";
import type { RecommendationSurface } from "@/lib/recommendations/fallbackRecs";
import type { GigaPersonaId } from "@/lib/personas/gigaPersonas";
import { cn } from "@/lib/utils";

interface RecommendationChipsProps {
  surface: RecommendationSurface;
  sessionToken: string | null;
  currentPersonaId?: GigaPersonaId | null;
  limit?: number;
  onApplyPrompt?: (prompt: string) => void;
  onSelectPersona?: (personaId: GigaPersonaId) => void;
  className?: string;
}

export function RecommendationChips({
  surface,
  sessionToken,
  currentPersonaId,
  limit = 2,
  onApplyPrompt,
  onSelectPersona,
  className,
}: RecommendationChipsProps) {
  const { recommendations, loading, offline } = useRecommendations({
    surface,
    sessionToken,
    currentPersonaId,
    limit,
  });

  if (loading || recommendations.length === 0) return null;

  return (
    <div className={cn("chat-suggested-chips min-w-0", className)}>
      <p className="sr-only">
        Suggested next steps{offline ? " (offline picks)" : ""}
      </p>
      <div className="chat-suggested-chips__row flex gap-2 overflow-x-auto overscroll-x-contain whitespace-nowrap pb-0.5">
        {recommendations.map((item) => (
          <button
            key={`${item.action}:${item.title}`}
            type="button"
            title={item.reason}
            onClick={() =>
              applyRecommendationAction({ item, onApplyPrompt, onSelectPersona })
            }
            className={cn(
              "inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              item.entitlement === "pro"
                ? "border-amber-500/40 bg-amber-500/10 text-foreground hover:bg-amber-500/15"
                : "border-border bg-card text-foreground hover:border-accent/40 hover:bg-accent/5"
            )}
          >
            <span>{item.title}</span>
            {item.entitlement === "pro" ? (
              <span className="ml-1.5 shrink-0 text-[10px] uppercase text-amber-600">Pro</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
