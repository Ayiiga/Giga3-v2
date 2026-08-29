"use client";

import { RecentGenerationsList } from "@/components/media/RecentGenerationsList";
import { usePolledMediaJobs } from "@/hooks/usePolledMediaJobs";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { mediaJobsRefreshRef } from "@/lib/media/jobsRefresh";
import { memo, useEffect } from "react";

interface RecentGenerationsSectionProps {
  userId: string;
  mounted: boolean;
}

/** Polls job history in isolation — does not re-render the generate form. */
function RecentGenerationsSectionComponent({
  userId,
  mounted,
}: RecentGenerationsSectionProps) {
  useRenderDiagnostic("RecentGenerationsSection");

  const { jobs, refreshJobs } = usePolledMediaJobs(userId, mounted);

  useEffect(() => {
    mediaJobsRefreshRef.current = refreshJobs;
    return () => {
      if (mediaJobsRefreshRef.current === refreshJobs) {
        mediaJobsRefreshRef.current = null;
      }
    };
  }, [refreshJobs]);

  return <RecentGenerationsList jobs={jobs} />;
}

export const RecentGenerationsSection = memo(RecentGenerationsSectionComponent);
