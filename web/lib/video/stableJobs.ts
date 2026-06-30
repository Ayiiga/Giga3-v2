export type VideoJobRow = {
  _id: string;
  status: string;
  category: string;
  prompt: string;
  outputUrl?: string | null;
  errorMessage?: string | null;
};

export function videoJobsEqual(a: VideoJobRow[], b: VideoJobRow[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x._id !== y._id ||
      x.status !== y.status ||
      x.category !== y.category ||
      x.prompt !== y.prompt ||
      x.outputUrl !== y.outputUrl ||
      x.errorMessage !== y.errorMessage
    ) {
      return false;
    }
  }
  return true;
}

export function hasActiveVideoJobs(jobs: VideoJobRow[]): boolean {
  return jobs.some((j) => j.status === "processing");
}
