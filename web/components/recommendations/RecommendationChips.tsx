"use client";

import { useRecommendations } from "@/hooks/useRecommendations";
import { applyRecommendationAction } from "@/lib/recommendations/applyRecommendation";
import type { RecommendationSurface } from "@/lib/recommendations/fallbackRecs";
import type { GigaPersonaId } from "@/lib/personas/gigaPersonas";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

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
  limit = 3,
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
    <div className={cn("space-y-2", className)}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden />
        Suggested next steps
        {offline ? (
          <span className="font-normal normal-case text-muted">(offline picks)</span>
        ) : null}
      </p>
      <div className="flex flex-wrap gap-2">
        {recommendations.map((item) => (
          <button
            key={`${item.action}:${item.title}`}
            type="button"
            title={item.reason}
            onClick={() =>
              applyRecommendationAction({ item, onApplyPrompt, onSelectPersona })
            }
            className={cn(
              "rounded-full border px-3 py-1.5 text-left text-xs transition-colors",
              item.entitlement === "pro"
                ? "border-amber-500/40 bg-amber-500/10 text-foreground hover:bg-amber-500/15"
                : "border-border bg-card text-foreground hover:border-accent/40 hover:bg-accent/5"
            )}
          >
            <span className="font-medium">{item.title}</span>
            {item.entitlement === "pro" ? (
              <span className="ml-1.5 text-[10px] uppercase text-amber-600">Pro</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
