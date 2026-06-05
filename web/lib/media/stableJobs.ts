export type MediaJobRow = {
  _id: string;
  status: string;
  mediaType: string;
  prompt: string;
  outputUrl?: string | null;
  errorMessage?: string | null;
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
      x.errorMessage !== y.errorMessage
    ) {
      return false;
    }
  }
  return true;
}

/** Terminal jobs are not polled aggressively — failed jobs never trigger fast refresh. */
export function hasActiveMediaJobs(jobs: MediaJobRow[]): boolean {
  return jobs.some((j) => j.status === "processing");
}
