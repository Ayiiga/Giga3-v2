"use client";

import { useRecommendations } from "@/hooks/useRecommendations";
import { applyRecommendationAction } from "@/lib/recommendations/applyRecommendation";
import type { RecommendationSurface } from "@/lib/recommendations/fallbackRecs";
import type { GigaPersonaId } from "@/lib/personas/gigaPersonas";
import { cn } from "@/lib/utils";
import { ArrowRight, Sparkles } from "lucide-react";

interface RecommendationEmptyStateProps {
  surface: RecommendationSurface;
  sessionToken: string | null;
  title?: string;
  description?: string;
  onApplyPrompt?: (prompt: string) => void;
  onSelectPersona?: (personaId: GigaPersonaId) => void;
  className?: string;
}

export function RecommendationEmptyState({
  surface,
  sessionToken,
  title = "Explore Giga3",
  description = "Personalized next steps based on your plan and recent activity.",
  onApplyPrompt,
  onSelectPersona,
  className,
}: RecommendationEmptyStateProps) {
  const { recommendations, loading, offline } = useRecommendations({
    surface,
    sessionToken,
    limit: 4,
  });

  if (loading) {
    return (
      <p className={cn("text-sm text-muted", className)}>Loading suggestions…</p>
    );
  }

  const cards = recommendations.slice(0, 4);
  if (cards.length === 0) return null;

  return (
    <section className={cn("rounded-xl border border-border bg-card p-4 sm:p-5", className)}>
      <div className="mb-4 flex items-start gap-2">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted">
            {description}
            {offline ? " Showing offline suggestions." : null}
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((item) => (
          <button
            key={`${item.action}:${item.title}`}
            type="button"
            onClick={() =>
              applyRecommendationAction({ item, onApplyPrompt, onSelectPersona })
            }
            className="saas-card flex min-h-[5.5rem] flex-col justify-between rounded-xl border border-border p-4 text-left transition-colors hover:border-accent/40 hover:bg-accent/5"
          >
            <div>
              <p className="font-medium text-foreground">{item.title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted">{item.reason}</p>
            </div>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent">
              {item.entitlement === "pro" ? "Pro feature" : "Try this"}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
