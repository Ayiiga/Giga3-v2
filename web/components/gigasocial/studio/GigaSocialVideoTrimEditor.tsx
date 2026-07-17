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
import { Loader2, Pause, Play, Scissors, X } from "lucide-react";
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
  const abortRef = useRef<AbortController | null>(null);
  const [startSec, setStartSec] = useState(0);
  const [playing, setPlaying] = useState(false);
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

  const clipLabel = formatVideoTime(trimRange.endSec - trimRange.startSec);

  const seekPreview = useCallback(
    (timeSec: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.pause();
      setPlaying(false);
      video.currentTime = timeSec;
    },
    []
  );

  useEffect(() => {
    seekPreview(trimRange.startSec);
  }, [seekPreview, trimRange.startSec]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const togglePlayPreview = useCallback(async () => {
    const video = videoRef.current;
    if (!video || exporting) return;

    if (playing) {
      video.pause();
      setPlaying(false);
      return;
    }

    video.currentTime = trimRange.startSec;
    const onTimeUpdate = () => {
      if (video.currentTime >= trimRange.endSec - 0.05) {
        video.pause();
        video.removeEventListener("timeupdate", onTimeUpdate);
        setPlaying(false);
        video.currentTime = trimRange.startSec;
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
        "gigasocial-video-trim-editor overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-b from-slate-950 to-slate-900 text-white shadow-lg",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/90">
            <Scissors className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold">Video editor</p>
            <p className="text-[11px] text-violet-200/90">
              Trim to {maxClipSec}s max · source {formatVideoTime(durationSec)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={exporting}
          className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-50"
          aria-label="Cancel video trim"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="relative bg-black">
        <video
          ref={videoRef}
          src={previewUrl}
          className="mx-auto max-h-[min(52vh,22rem)] w-full object-contain"
          playsInline
          preload="metadata"
          onClick={() => void togglePlayPreview()}
        />
        <button
          type="button"
          onClick={() => void togglePlayPreview()}
          disabled={exporting}
          className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-white ring-2 ring-white/30 backdrop-blur-sm disabled:opacity-40"
          aria-label={playing ? "Pause preview" : "Play preview"}
        >
          {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        </button>
      </div>

      <div className="space-y-3 px-4 py-4">
        <div className="flex items-center justify-between text-xs text-violet-100/90">
          <span>
            Clip: {formatVideoTime(trimRange.startSec)} – {formatVideoTime(trimRange.endSec)}
          </span>
          <span className="rounded-full bg-violet-600/30 px-2 py-0.5 font-medium text-violet-50">
            {clipLabel} selected
          </span>
        </div>

        <div className="space-y-2">
          <label htmlFor="gigasocial-trim-start" className="text-[11px] font-medium text-violet-100/80">
            Drag to choose your {maxClipSec}s segment
          </label>
          <input
            id="gigasocial-trim-start"
            type="range"
            min={0}
            max={maxStart || 0}
            step={0.1}
            value={startSec}
            disabled={exporting || maxStart <= 0}
            onChange={(event) => {
              const next = Number(event.target.value);
              setStartSec(next);
              seekPreview(computeTrimRange(durationSec, next, maxClipSec).startSec);
            }}
            className="gigasocial-trim-slider w-full accent-violet-400"
          />
          <div className="flex justify-between text-[10px] text-white/50">
            <span>0:00</span>
            <span>{formatVideoTime(durationSec)}</span>
          </div>
        </div>

        {error ? (
          <p className="rounded-lg border border-red-400/30 bg-red-950/40 px-3 py-2 text-xs text-red-100">
            {error}
          </p>
        ) : null}

        {exporting ? (
          <div className="space-y-2" role="status" aria-live="polite">
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-violet-400 transition-all"
                style={{ width: `${exportPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-violet-100">
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Exporting clip… {exportPercent}%
              </span>
              <button
                type="button"
                onClick={handleCancelExport}
                className="text-red-200 hover:text-red-100"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="min-h-11 flex-1"
              onClick={() => void handleExport()}
            >
              Use {clipLabel} clip
            </Button>
            <Button type="button" variant="outline" className="min-h-11" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});
