export type MediaJobRow = {
  _id: string;
  status: string;
  mediaType: string;
  prompt: string;
  outputUrl?: string | null;
  errorMessage?: string | null;
  progressLabel?: string | null;
  progressStage?: string | null;
  provider?: string | null;
  createdAt?: number;
};

export function mediaJobsEqual(a: MediaJobRow[], b: MediaJobRow[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x._id !== y._id ||
      x.status !== y.status ||
      x.mediaType !== y.mediaType ||
      x.prompt !== y.prompt ||
      x.outputUrl !== y.outputUrl ||
      x.errorMessage !== y.errorMessage ||
      (x.progressLabel ?? null) !== (y.progressLabel ?? null) ||
      (x.progressStage ?? null) !== (y.progressStage ?? null)
    ) {
      return false;
    }
  }
  return true;
}

/** Terminal jobs are not polled aggressively — failed jobs never trigger fast refresh. */
export function hasActiveMediaJobs(jobs: MediaJobRow[]): boolean {
  return jobs.some((j) => j.status === "processing" || j.status === "pending");
}

/** Coarse progress % for the strip, derived from the worker's stage. */
export function progressForStage(stage: string | null | undefined): number {
  switch (stage) {
    case "queued":
      return 8;
    case "starting":
      return 15;
    case "generating":
      return 55;
    case "finishing":
      return 90;
    case "done":
      return 100;
    default:
      return 10;
  }
}

/** Friendly provider name for status copy — never claims a provider that did not run. */
export function providerDisplayName(provider: string | null | undefined): string | null {
  if (provider === "fal") return "fal.ai";
  if (provider === "replicate") return "Replicate";
  return null;
}
