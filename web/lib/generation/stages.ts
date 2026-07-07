export type GenerationStage = {
  atMs: number;
  label: string;
  /** Optional progress hint 0–100 for UI bars. */
  progress?: number;
};

export const IMAGE_GENERATION_STAGES: GenerationStage[] = [
  { atMs: 0, label: "Preparing…", progress: 8 },
  { atMs: 2500, label: "Generating image…", progress: 35 },
  { atMs: 12_000, label: "Enhancing quality…", progress: 72 },
  { atMs: 28_000, label: "Finalizing…", progress: 92 },
];

export const VIDEO_GENERATION_STAGES: GenerationStage[] = [
  { atMs: 0, label: "Preparing assets…", progress: 6 },
  { atMs: 4000, label: "Rendering…", progress: 40 },
  { atMs: 25_000, label: "Encoding…", progress: 78 },
  { atMs: 55_000, label: "Finalizing…", progress: 94 },
];

export const DOCUMENT_GENERATION_STAGES: GenerationStage[] = [
  { atMs: 0, label: "Preparing document…", progress: 10 },
  { atMs: 3000, label: "Writing content…", progress: 45 },
  { atMs: 15_000, label: "Formatting…", progress: 80 },
  { atMs: 35_000, label: "Finalizing…", progress: 95 },
];

export const ANALYSIS_GENERATION_STAGES: GenerationStage[] = [
  { atMs: 0, label: "Reading files…", progress: 12 },
  { atMs: 2500, label: "Analyzing…", progress: 50 },
  { atMs: 12_000, label: "Summarizing…", progress: 85 },
];

function stageForElapsed(stages: GenerationStage[], elapsedMs: number): GenerationStage {
  let active = stages[0];
  for (const stage of stages) {
    if (elapsedMs >= stage.atMs) active = stage;
    else break;
  }
  return active;
}

export function generationStageForElapsed(
  kind: "image" | "video" | "document" | "analysis",
  elapsedMs: number
): GenerationStage {
  const stages =
    kind === "image"
      ? IMAGE_GENERATION_STAGES
      : kind === "video"
        ? VIDEO_GENERATION_STAGES
        : kind === "document"
          ? DOCUMENT_GENERATION_STAGES
          : ANALYSIS_GENERATION_STAGES;
  return stageForElapsed(stages, elapsedMs);
}

export function generationStageBoundaries(stages: GenerationStage[]): number[] {
  return stages.slice(1).map((stage) => stage.atMs);
}
