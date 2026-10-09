"use client";

import { MediaCardActions } from "@/components/media/MediaCardActions";
import { MediaVideoPlayer } from "@/components/media/MediaVideoPlayer";
import type { MediaJobRow } from "@/hooks/useStableMediaJobs";
import { formatMediaError } from "@/lib/media/errors";
import { cn } from "@/lib/utils";
import { Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
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

function statusLabel(status: MediaJobRow["status"]): string {
  switch (status) {
    case "processing":
      return "Generating…";
    case "queued":
    case "pending":
      return "Queued";
    case "succeeded":
      return "Ready";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

function isActiveStatus(status: string): boolean {
  return status === "processing" || status === "queued" || status === "pending";
}

function retryHref(job: MediaJobRow): string {
  const tab = job.mediaType === "video" ? "video" : "image";
  const params = new URLSearchParams({
    tab,
    prompt: job.prompt.slice(0, 500),
  });
  return `/media?${params.toString()}`;
}

export const MediaGenerationCard = memo(function MediaGenerationCard({
  job,
}: MediaGenerationCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const succeeded = job.status === "succeeded" && Boolean(job.outputUrl);
  const failed = job.status === "failed";
  const kind = job.mediaType === "video" ? "video" : "image";
  const title = job.prompt.trim() || `${kind} generation`;
  const plainError = failed
    ? formatMediaError(job.errorMessage || "Generation failed. Please try again.")
    : null;

  return (
    <article className="saas-card flex flex-col overflow-hidden shadow-md">
      <div className="relative aspect-video w-full shrink-0 bg-zinc-950">
        {isActiveStatus(job.status) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-muted">
            <Loader2 className="h-8 w-8 animate-spin text-white/80" aria-hidden />
            <span className="text-xs font-medium text-white/90">
              {statusLabel(job.status)}
              {job.progressLabel ? ` · ${job.progressLabel}` : ""}
            </span>
          </div>
        )}

        {failed && (
          <div className="absolute inset-0 flex flex-col items-start justify-between gap-3 overflow-y-auto p-4">
            <p className="text-sm leading-5 text-red-100">{plainError}</p>
            <Link
              href={retryHref(job)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-foreground"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Retry with same prompt
            </Link>
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
              alt={title.slice(0, 80)}
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
        <MediaCardActions
          url={job.outputUrl}
          kind={kind}
          prompt={job.prompt}
          jobId={job._id}
          provider={job.provider}
        />
      )}

      <div className="border-t border-border p-4 text-sm sm:text-base">
        <p className="font-semibold capitalize text-foreground">
          {job.mediaType} · {statusLabel(job.status)}
        </p>
        <p className="mt-1 line-clamp-2 text-muted" title={job.prompt}>
          {title}
        </p>
      </div>
    </article>
  );
}, cardPropsEqual);
