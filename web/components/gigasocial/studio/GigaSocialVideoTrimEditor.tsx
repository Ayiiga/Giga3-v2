"use client";

import { Button } from "@/components/ui/Button";
import { SOCIAL_MAX_VIDEO_DURATION_SEC } from "@/lib/gigasocial/constants";
import { generateVideoThumbnail } from "@/lib/gigasocial/mediaUpload";
import {
  computeTrimRange,
  formatVideoTime,
  trimVideoFile,
} from "@/lib/gigasocial/videoTrim";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Film,
  Loader2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

export type GigaSocialVideoTrimResult = {
  file: File;
  durationSec: number;
  thumbnailUrl?: string;
  trimmed: boolean;
};

type GigaSocialVideoTrimEditorProps = {
  file: File;
  previewUrl: string;
  durationSec: number;
  maxClipSec?: number;
  className?: string;
  onCancel: () => void;
  onComplete: (result: GigaSocialVideoTrimResult) => void;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const GigaSocialVideoTrimEditor = memo(function GigaSocialVideoTrimEditor({
  file,
  previewUrl,
  durationSec,
  maxClipSec = SOCIAL_MAX_VIDEO_DURATION_SEC,
  className,
  onCancel,
  onComplete,
}: GigaSocialVideoTrimEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [startSec, setStartSec] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [previewTimeSec, setPreviewTimeSec] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportPercent, setExportPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const trimRange = useMemo(
    () => computeTrimRange(durationSec, startSec, maxClipSec),
    [durationSec, maxClipSec, startSec]
  );

  const maxStart = useMemo(
    () => Math.max(0, durationSec - Math.min(maxClipSec, durationSec)),
    [durationSec, maxClipSec]
  );

  const clipDurationSec = trimRange.endSec - trimRange.startSec;
  const clipLabel = formatVideoTime(clipDurationSec);
  const startPercent = durationSec > 0 ? (trimRange.startSec / durationSec) * 100 : 0;
  const clipWidthPercent = durationSec > 0 ? (clipDurationSec / durationSec) * 100 : 100;
  const playheadPercent =
    durationSec > 0 ? (Math.min(previewTimeSec, durationSec) / durationSec) * 100 : 0;

  const seekPreview = useCallback((timeSec: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setPlaying(false);
    video.currentTime = timeSec;
    setPreviewTimeSec(timeSec);
  }, []);

  const setClipStart = useCallback(
    (nextStart: number) => {
      const clamped = Math.min(Math.max(0, nextStart), maxStart);
      setStartSec(clamped);
      seekPreview(computeTrimRange(durationSec, clamped, maxClipSec).startSec);
    },
    [durationSec, maxClipSec, maxStart, seekPreview]
  );

  useEffect(() => {
    seekPreview(trimRange.startSec);
  }, [seekPreview, trimRange.startSec]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleTimelinePointer = useCallback(
    (clientX: number) => {
      const track = timelineRef.current;
      if (!track || exporting || maxStart <= 0) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const clipLen = Math.min(maxClipSec, durationSec);
      const idealStart = ratio * durationSec - clipLen / 2;
      setClipStart(idealStart);
    },
    [durationSec, exporting, maxClipSec, maxStart, setClipStart]
  );

  const togglePlayPreview = useCallback(async () => {
    const video = videoRef.current;
    if (!video || exporting) return;

    if (playing) {
      video.pause();
      setPlaying(false);
      return;
    }

    video.currentTime = trimRange.startSec;
    setPreviewTimeSec(trimRange.startSec);
    const onTimeUpdate = () => {
      setPreviewTimeSec(video.currentTime);
      if (video.currentTime >= trimRange.endSec - 0.05) {
        video.pause();
        video.removeEventListener("timeupdate", onTimeUpdate);
        setPlaying(false);
        video.currentTime = trimRange.startSec;
        setPreviewTimeSec(trimRange.startSec);
      }
    };
    video.addEventListener("timeupdate", onTimeUpdate);
    try {
      await video.play();
      setPlaying(true);
    } catch {
      setError("Could not play preview. Tap the timeline to adjust your clip.");
      setPlaying(false);
    }
  }, [exporting, playing, trimRange.endSec, trimRange.startSec]);

  const handleExport = useCallback(async () => {
    if (exporting) return;
    setError(null);
    setExporting(true);
    setExportPercent(0);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { file: trimmedFile, durationSec: trimmedDuration } = await trimVideoFile(
        file,
        trimRange,
        {
          signal: controller.signal,
          onProgress: (value) => setExportPercent(Math.round(value * 100)),
        }
      );
      const thumbnailUrl = await generateVideoThumbnail(trimmedFile);
      onComplete({
        file: trimmedFile,
        durationSec: trimmedDuration,
        thumbnailUrl,
        trimmed: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not trim video.");
    } finally {
      setExporting(false);
      setExportPercent(0);
      abortRef.current = null;
    }
  }, [exporting, file, onComplete, trimRange]);

  const handleCancelExport = useCallback(() => {
    abortRef.current?.abort();
    setExporting(false);
    setExportPercent(0);
  }, []);

  return (
    <div
      className={cn(
        "gigasocial-video-trim-editor overflow-hidden rounded-2xl border border-violet-200/80 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-white shadow-xl",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 shadow-md shadow-violet-900/40">
            <Film className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight">Clip Studio</p>
            <p className="truncate text-[11px] text-violet-200/85">
              {file.name} · {formatFileSize(file.size)} · {formatVideoTime(durationSec)} source
            </p>
            <p className="mt-0.5 text-[11px] text-white/55">
              Choose any {maxClipSec}s segment — required before posting long videos.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={exporting}
          className="shrink-0 rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-50"
          aria-label="Close clip editor"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="relative bg-black">
        <video
          ref={videoRef}
          src={previewUrl}
          className="mx-auto max-h-[min(48vh,20rem)] w-full object-contain"
          playsInline
          preload="metadata"
          onClick={() => void togglePlayPreview()}
          onTimeUpdate={(event) => setPreviewTimeSec(event.currentTarget.currentTime)}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between bg-gradient-to-b from-black/70 to-transparent px-3 py-2 text-[11px] font-medium tabular-nums text-white/90">
          <span>{formatVideoTime(previewTimeSec)}</span>
          <span className="rounded-md bg-violet-600/80 px-2 py-0.5 text-[10px] uppercase tracking-wide">
            {clipLabel} clip
          </span>
          <span>{formatVideoTime(durationSec)}</span>
        </div>
        {!playing ? (
          <button
            type="button"
            onClick={() => void togglePlayPreview()}
            disabled={exporting}
            className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-white ring-2 ring-white/25 transition hover:bg-black/75 disabled:opacity-40"
            aria-label="Play clip preview"
          >
            <Play className="h-6 w-6 translate-x-0.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void togglePlayPreview()}
            disabled={exporting}
            className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/65 text-white ring-1 ring-white/20"
            aria-label="Pause preview"
          >
            <Pause className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-violet-100">
              Timeline · {formatVideoTime(trimRange.startSec)} → {formatVideoTime(trimRange.endSec)}
            </span>
            <span className="rounded-full border border-violet-400/30 bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-100">
              {maxClipSec}s max
            </span>
          </div>

          <div
            ref={timelineRef}
            className="gigasocial-trim-timeline relative"
            role="slider"
            aria-label={`Select ${maxClipSec} second clip segment`}
            aria-valuemin={0}
            aria-valuemax={maxStart}
            aria-valuenow={startSec}
            tabIndex={0}
            onKeyDown={(event) => {
              if (exporting) return;
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                setClipStart(startSec - (event.shiftKey ? 5 : 1));
              } else if (event.key === "ArrowRight") {
                event.preventDefault();
                setClipStart(startSec + (event.shiftKey ? 5 : 1));
              } else if (event.key === "Home") {
                event.preventDefault();
                setClipStart(0);
              } else if (event.key === "End") {
                event.preventDefault();
                setClipStart(maxStart);
              }
            }}
            onPointerDown={(event) => {
              if (exporting) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              handleTimelinePointer(event.clientX);
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId) || exporting) return;
              handleTimelinePointer(event.clientX);
            }}
          >
            <div className="gigasocial-trim-timeline__track" />
            <div
              className="gigasocial-trim-timeline__selection"
              style={{ left: `${startPercent}%`, width: `${clipWidthPercent}%` }}
            />
            <div
              className="gigasocial-trim-timeline__playhead"
              style={{ left: `${playheadPercent}%` }}
              aria-hidden
            />
            <div
              className="gigasocial-trim-timeline__handle gigasocial-trim-timeline__handle--start"
              style={{ left: `${startPercent}%` }}
              aria-hidden
            />
            <div
              className="gigasocial-trim-timeline__handle gigasocial-trim-timeline__handle--end"
              style={{ left: `${startPercent + clipWidthPercent}%` }}
              aria-hidden
            />
          </div>

          <input
            id="gigasocial-trim-start"
            type="range"
            min={0}
            max={maxStart || 0}
            step={0.1}
            value={startSec}
            disabled={exporting || maxStart <= 0}
            onChange={(event) => setClipStart(Number(event.target.value))}
            className="gigasocial-trim-slider sr-only"
            aria-hidden
          />

          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              <button
                type="button"
                disabled={exporting || startSec <= 0}
                onClick={() => setClipStart(0)}
                className="gigasocial-trim-nudge"
                aria-label="Jump to start of video"
              >
                <SkipBack className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                disabled={exporting || startSec <= 0}
                onClick={() => setClipStart(startSec - 1)}
                className="gigasocial-trim-nudge"
                aria-label="Move clip one second earlier"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                disabled={exporting || startSec >= maxStart}
                onClick={() => setClipStart(startSec + 1)}
                className="gigasocial-trim-nudge"
                aria-label="Move clip one second later"
              >
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                disabled={exporting || startSec >= maxStart}
                onClick={() => setClipStart(maxStart)}
                className="gigasocial-trim-nudge"
                aria-label="Jump to end of video"
              >
                <SkipForward className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
            <span className="text-[10px] text-white/45">Tap or drag timeline · arrow keys ±1s</span>
          </div>
        </div>

        {error ? (
          <p className="rounded-xl border border-red-400/35 bg-red-950/50 px-3 py-2.5 text-xs text-red-100">
            {error}
          </p>
        ) : null}

        {exporting ? (
          <div className="space-y-2.5 rounded-xl border border-white/10 bg-white/5 p-3" role="status" aria-live="polite">
            <div className="flex items-center justify-between text-xs text-violet-100">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Exporting {clipLabel} clip
              </span>
              <span className="tabular-nums">{exportPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-violet-300 transition-all"
                style={{ width: `${exportPercent}%` }}
              />
            </div>
            <button
              type="button"
              onClick={handleCancelExport}
              className="text-xs text-red-200 hover:text-red-100"
            >
              Cancel export
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="min-h-11 flex-1 text-sm font-semibold"
              onClick={() => void handleExport()}
            >
              Export {clipLabel} clip for post
            </Button>
            <Button type="button" variant="outline" className="min-h-11 sm:min-w-[7rem]" onClick={onCancel}>
              Discard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});
