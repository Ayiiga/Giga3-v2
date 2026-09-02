"use client";

import { MessageMediaBlock } from "@/components/chat/MessageMediaBlock";
import type { MediaJobRow } from "@/hooks/useStableMediaJobs";
import { Loader2 } from "lucide-react";
import { memo } from "react";

interface MediaGenerationCardProps {
  job: MediaJobRow;
}

function cardPropsEqual(
  prev: MediaGenerationCardProps,
  next: MediaGenerationCardProps
): boolean {
  const a = prev.job;
  const b = next.job;
  return (
    a._id === b._id &&
    a.status === b.status &&
    a.mediaType === b.mediaType &&
    a.prompt === b.prompt &&
    a.outputUrl === b.outputUrl &&
    a.errorMessage === b.errorMessage &&
    (a.progressLabel ?? null) === (b.progressLabel ?? null)
  );
}

export const MediaGenerationCard = memo(function MediaGenerationCard({
  job,
}: MediaGenerationCardProps) {
  return (
    <article className="saas-card overflow-hidden shadow-md">
      <div className="aspect-video w-full bg-black/40">
        {job.status === "processing" && (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-muted">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
            {job.progressLabel && <span className="text-xs">{job.progressLabel}</span>}
          </div>
        )}
        {job.status === "failed" && job.errorMessage && (
          <div className="flex h-full items-start p-4 text-sm text-red-100">
            {job.errorMessage}
          </div>
        )}
        {job.outputUrl && job.status === "succeeded" && (
          <div className="h-full p-3">
            <MessageMediaBlock
              url={job.outputUrl}
              kind={job.mediaType === "video" ? "video" : "image"}
            />
          </div>
        )}
      </div>
      <div className="p-4 text-sm sm:text-base">
        <p className="font-semibold capitalize">
          {job.mediaType} · {job.status}
        </p>
        <p className="mt-1 line-clamp-2 text-muted">{job.prompt}</p>
      </div>
    </article>
  );
}, cardPropsEqual);
