"use client";

import { MediaGenerationCard } from "@/components/media/MediaGenerationCard";
import type { MediaJobRow } from "@/hooks/useStableMediaJobs";
import { memo } from "react";

interface RecentGenerationsListProps {
  jobs: MediaJobRow[];
}

function listPropsEqual(
  prev: RecentGenerationsListProps,
  next: RecentGenerationsListProps
): boolean {
  return prev.jobs === next.jobs;
}

export const RecentGenerationsList = memo(function RecentGenerationsList({
  jobs,
}: RecentGenerationsListProps) {
  return (
    <section className="space-y-6">
      <h2 className="text-xl font-bold sm:text-2xl">Recent generations</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        {jobs.length === 0 && (
          <p className="text-base text-muted">No media yet — create your first above.</p>
        )}
        {jobs.map((job) => (
          <MediaGenerationCard key={job._id} job={job} />
        ))}
      </div>
    </section>
  );
}, listPropsEqual);
