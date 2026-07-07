"use client";

import {
  ANALYSIS_GENERATION_STAGES,
  DOCUMENT_GENERATION_STAGES,
  IMAGE_GENERATION_STAGES,
  VIDEO_GENERATION_STAGES,
  generationStageBoundaries,
  generationStageForElapsed,
  type GenerationStage,
} from "@/lib/generation/stages";
import { useEffect, useState } from "react";

const STAGE_TABLE = {
  image: IMAGE_GENERATION_STAGES,
  video: VIDEO_GENERATION_STAGES,
  document: DOCUMENT_GENERATION_STAGES,
  analysis: ANALYSIS_GENERATION_STAGES,
} as const;

export function useGenerationStages(
  active: boolean,
  kind: keyof typeof STAGE_TABLE
): GenerationStage {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsedMs(0);
      return;
    }
    const start = Date.now();
    setElapsedMs(0);
    const boundaries = generationStageBoundaries(STAGE_TABLE[kind]);
    const timers = boundaries.map((boundary) =>
      window.setTimeout(() => setElapsedMs(Date.now() - start), boundary + 40)
    );
    const tick = window.setInterval(() => setElapsedMs(Date.now() - start), 4000);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(tick);
    };
  }, [active, kind]);

  if (!active) {
    return generationStageForElapsed(kind, 0);
  }
  return generationStageForElapsed(kind, elapsedMs);
}
