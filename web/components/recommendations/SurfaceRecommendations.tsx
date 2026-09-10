"use client";

import { RecommendationEmptyState } from "@/components/recommendations/RecommendationEmptyState";
import { RecommendationChips } from "@/components/recommendations/RecommendationChips";
import { getSessionToken } from "@/lib/auth";
import type { RecommendationSurface } from "@/lib/recommendations/fallbackRecs";
import type { GigaPersonaId } from "@/lib/personas/gigaPersonas";
import { useEffect, useState } from "react";

type SurfaceRecommendationsProps = {
  surface: RecommendationSurface;
  variant?: "cards" | "chips";
  limit?: number;
  title?: string;
  className?: string;
  currentPersonaId?: GigaPersonaId | null;
  onApplyPrompt?: (prompt: string) => void;
  onSelectPersona?: (personaId: GigaPersonaId) => void;
};

/** Shared recommendations strip — server-authoritative with offline fallback. */
export function SurfaceRecommendations({
  surface,
  variant = "cards",
  limit = 4,
  title,
  className,
  currentPersonaId,
  onApplyPrompt,
  onSelectPersona,
}: SurfaceRecommendationsProps) {
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    setSessionToken(getSessionToken());
  }, []);

  if (variant === "chips") {
    return (
      <RecommendationChips
        surface={surface}
        sessionToken={sessionToken}
        currentPersonaId={currentPersonaId}
        limit={limit}
        className={className}
        onApplyPrompt={onApplyPrompt}
        onSelectPersona={onSelectPersona}
      />
    );
  }

  return (
    <RecommendationEmptyState
      surface={surface}
      sessionToken={sessionToken}
      currentPersonaId={currentPersonaId}
      limit={limit}
      title={title}
      className={className}
      onApplyPrompt={onApplyPrompt}
      onSelectPersona={onSelectPersona}
    />
  );
}
