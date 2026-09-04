"use client";

import { MediaCardActions } from "@/components/media/MediaCardActions";
import { MediaVideoPlayer } from "@/components/media/MediaVideoPlayer";
import type { MediaJobRow } from "@/hooks/useStableMediaJobs";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { memo, useState } from "react";

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
  const [imageLoaded, setImageLoaded] = useState(false);
  const succeeded = job.status === "succeeded" && Boolean(job.outputUrl);
  const kind = job.mediaType === "video" ? "video" : "image";

  return (
    <article className="saas-card flex flex-col overflow-hidden shadow-md">
      <div className="relative aspect-video w-full shrink-0 bg-zinc-950">
        {job.status === "processing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-muted">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
            {job.progressLabel && <span className="text-xs text-white/80">{job.progressLabel}</span>}
          </div>
        )}

        {job.status === "failed" && job.errorMessage && (
          <div className="absolute inset-0 flex items-start overflow-y-auto p-4 text-sm text-red-100">
            {job.errorMessage}
          </div>
        )}

        {succeeded && job.outputUrl && kind === "video" && (
          <MediaVideoPlayer url={job.outputUrl} className="absolute inset-0" />
        )}

        {succeeded && job.outputUrl && kind === "image" && (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                <Loader2 className="h-8 w-8 animate-spin text-white/70" aria-hidden />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={job.outputUrl}
              alt="Generated image"
              className={cn(
                "h-full w-full object-contain transition-opacity",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
            />
          </>
        )}
      </div>

      {succeeded && job.outputUrl && (
        <MediaCardActions url={job.outputUrl} kind={kind} />
      )}

      <div className="border-t border-border p-4 text-sm sm:text-base">
        <p className="font-semibold capitalize">
          {job.mediaType} · {job.status}
        </p>
        <p className="mt-1 line-clamp-3 text-muted">{job.prompt}</p>
      </div>
    </article>
  );
}, cardPropsEqual);
