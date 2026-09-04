"use client";

import { GenerationProgressStrip } from "@/components/generation/GenerationProgressStrip";
import { MessageMediaBlock } from "@/components/chat/MessageMediaBlock";
import { Button } from "@/components/ui/Button";
import { VIDEO_CATEGORIES, type VideoCategoryId } from "@/lib/media/catalog";
import { progressForStage, providerDisplayName } from "@/lib/media/stableJobs";
import type { TrackedVideoJob } from "@/hooks/useMediaVideoJob";
import { VIDEO_SLOW_NOTICE_MS } from "@/hooks/useMediaVideoJob";
import {
  MEDIA_VIDEO_DEFAULT_DURATION_SEC,
  MEDIA_VIDEO_DURATION_OPTIONS,
  type MediaVideoDurationSec,
} from "@/lib/media/videoLimits";
import { mediaVideoCreditCost } from "@/lib/media/videoCredits";
import { VIDEO_TEXT_TIP, videoPromptNeedsTextGuard } from "@/lib/media/videoPromptTips";
import { cn } from "@/lib/utils";
import { Clapperboard, ImagePlus, Loader2, RefreshCw, Video } from "lucide-react";
import { useEffect, useState } from "react";

export type VideoAspect = "16:9" | "9:16" | "1:1";
export type VideoQuality = "720p" | "1080p";

export type VideoFormValues = {
  prompt: string;
  category: VideoCategoryId;
  sourceImageUrl: string;
  aspectRatio: VideoAspect;
  durationSec: MediaVideoDurationSec;
  quality: VideoQuality;
  audio: boolean;
};

const ASPECTS: { id: VideoAspect; label: string; hint: string }[] = [
  { id: "16:9", label: "Landscape", hint: "YouTube · 16:9" },
  { id: "9:16", label: "Portrait", hint: "TikTok / Reels · 9:16" },
  { id: "1:1", label: "Square", hint: "Feed · 1:1" },
];

const DURATIONS = MEDIA_VIDEO_DURATION_OPTIONS;

type VideoGenerateFormProps = {
  values: VideoFormValues;
  onChange: (patch: Partial<VideoFormValues>) => void;
  onGenerate: () => void;
  onRetry: () => void;
  onDismissResult: () => void;
  canGenerate: boolean;
  creditCost: number;
  creditsAvailable: number | null;
  submitting: boolean;
  job: TrackedVideoJob | null;
  jobStartedAt: number;
  error: string | null;
  recentImageUrls: string[];
};

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

export function VideoGenerateForm({
  values,
  onChange,
  onGenerate,
  onRetry,
  onDismissResult,
  canGenerate,
  creditCost,
  creditsAvailable,
  submitting,
  job,
  jobStartedAt,
  error,
  recentImageUrls,
}: VideoGenerateFormProps) {
  const processing = submitting || job?.status === "processing";
  const succeeded = job?.status === "succeeded" && Boolean(job.outputUrl);
  const failed = job?.status === "failed" || (Boolean(error) && !processing);
  const [showImageField, setShowImageField] = useState(Boolean(values.sourceImageUrl));
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!processing || !jobStartedAt) {
      setElapsedMs(0);
      return;
    }
    const id = window.setInterval(() => setElapsedMs(Date.now() - jobStartedAt), 1000);
    return () => window.clearInterval(id);
  }, [processing, jobStartedAt]);

  const imageInvalid = values.sourceImageUrl.trim().length > 0 && !isHttpUrl(values.sourceImageUrl);
  const promptReady = values.prompt.trim().length >= 3;
  const textRisk = videoPromptNeedsTextGuard(values.prompt);
  const disabled = processing || !canGenerate || !promptReady || imageInvalid;
  const provider = providerDisplayName(job?.provider);
  const elapsedLabel = elapsedMs
    ? `${Math.floor(elapsedMs / 60000)}:${String(Math.floor((elapsedMs % 60000) / 1000)).padStart(2, "0")}`
    : null;

  return (
    <div className="space-y-5" data-testid="video-generate-form">
      <label className="block">
        <span className="text-sm font-bold uppercase tracking-wide text-muted">Describe your video</span>
        <textarea
          value={values.prompt}
          onChange={(e) => onChange({ prompt: e.target.value })}
          rows={4}
          disabled={processing}
          placeholder="Cinematic office scene with people presenting a phone — avoid asking for readable text on screens…"
          className="input-surface mt-2 sm:text-lg"
        />
        {textRisk && !values.sourceImageUrl.trim() && (
          <p className="mt-2 rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-100">
            {VIDEO_TEXT_TIP}
          </p>
        )}
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-bold uppercase tracking-wide text-muted">Style</legend>
        <div className="flex flex-wrap gap-2">
          {VIDEO_CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={processing}
              aria-pressed={values.category === item.id}
              onClick={() => onChange({ category: item.id })}
              className={cn(
                "min-h-11 rounded-full border px-4 py-2 text-sm font-semibold",
                values.category === item.id
                  ? "border-accent bg-accent/15 text-foreground"
                  : "border-border text-muted hover:border-violet-500/40 hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <fieldset className="space-y-2">
          <legend className="text-sm font-bold uppercase tracking-wide text-muted">Format</legend>
          <div className="grid grid-cols-3 gap-2">
            {ASPECTS.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={processing}
                aria-pressed={values.aspectRatio === a.id}
                title={a.hint}
                onClick={() => onChange({ aspectRatio: a.id })}
                className={cn(
                  "min-h-11 rounded-xl border px-2 py-2 text-xs font-semibold sm:text-sm",
                  values.aspectRatio === a.id
                    ? "border-accent bg-accent/15 text-foreground"
                    : "border-border text-muted hover:text-foreground"
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-bold uppercase tracking-wide text-muted">Length</legend>
          <div className="grid grid-cols-3 gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                disabled={processing}
                aria-pressed={values.durationSec === d}
                onClick={() => onChange({ durationSec: d })}
                className={cn(
                  "min-h-11 rounded-xl border px-2 py-2 text-sm font-semibold",
                  values.durationSec === d
                    ? "border-accent bg-accent/15 text-foreground"
                    : "border-border text-muted hover:text-foreground"
                )}
              >
                {d}s
                <span className="block text-[11px] font-normal text-muted">
                  {mediaVideoCreditCost(d)} credits
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-bold uppercase tracking-wide text-muted">Quality</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["720p", "1080p"] as VideoQuality[]).map((q) => (
              <button
                key={q}
                type="button"
                disabled={processing}
                aria-pressed={values.quality === q}
                onClick={() => onChange({ quality: q })}
                className={cn(
                  "min-h-11 rounded-xl border px-2 py-2 text-sm font-semibold",
                  values.quality === q
                    ? "border-accent bg-accent/15 text-foreground"
                    : "border-border text-muted hover:text-foreground"
                )}
              >
                {q === "720p" ? "Standard" : "HD"}
                <span className="block text-[11px] font-normal text-muted">{q}</span>
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="space-y-2">
        {!showImageField ? (
          <button
            type="button"
            disabled={processing}
            onClick={() => setShowImageField(true)}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent hover:underline"
          >
            <ImagePlus className="h-4 w-4" aria-hidden /> Start from an image (optional)
          </button>
        ) : (
          <div className="space-y-2 rounded-2xl border border-border p-3">
            <label className="text-sm font-bold uppercase tracking-wide text-muted">
              Start from an image
            </label>
            <input
              type="url"
              value={values.sourceImageUrl}
              disabled={processing}
              onChange={(e) => onChange({ sourceImageUrl: e.target.value })}
              placeholder="https://… public image URL — becomes the first frame"
              className="input-surface py-2 text-sm"
              aria-invalid={imageInvalid}
            />
            {imageInvalid && (
              <p className="text-xs text-red-600">Enter a full https:// image link.</p>
            )}
            {recentImageUrls.length > 0 && (
              <div>
                <p className="text-xs text-muted">Or pick one of your recent images:</p>
                <div className="mt-1 flex gap-2 overflow-x-auto pb-1">
                  {recentImageUrls.slice(0, 6).map((url) => (
                    <button
                      key={url}
                      type="button"
                      disabled={processing}
                      onClick={() => onChange({ sourceImageUrl: url })}
                      className={cn(
                        "h-14 w-14 shrink-0 overflow-hidden rounded-lg border",
                        values.sourceImageUrl === url ? "border-accent ring-2 ring-accent/40" : "border-border"
                      )}
                      aria-label="Use this image as the first frame"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {isHttpUrl(values.sourceImageUrl) && (
              <MessageMediaBlock url={values.sourceImageUrl.trim()} kind="image" />
            )}
            <button
              type="button"
              disabled={processing}
              onClick={() => {
                onChange({ sourceImageUrl: "" });
                setShowImageField(false);
              }}
              className="text-xs text-muted hover:text-foreground"
            >
              Remove image
            </button>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={values.audio}
            disabled={processing}
            onChange={(e) => onChange({ audio: e.target.checked })}
          />
          Add AI audio when the provider supports it (clips render at up to 12–15s per provider)
        </label>
      </div>

      <div className="min-h-[4.5rem] space-y-3" aria-live="polite">
        {processing && (
          <div className="space-y-2">
            <GenerationProgressStrip
              label={
                job?.progressLabel
                  ? `${job.progressLabel}${provider ? ` · ${provider}` : ""}`
                  : "Sending to video provider…"
              }
              progress={progressForStage(job?.progressStage)}
              state="processing"
            />
            <p className="text-xs text-muted">
              Usually 1–3 minutes{elapsedLabel ? ` · ${elapsedLabel} elapsed` : ""}. You can leave
              this page — the video is saved to Recent generations and we&apos;ll notify you.
              {elapsedMs > VIDEO_SLOW_NOTICE_MS && " Taking longer than usual; still working."}
            </p>
          </div>
        )}

        {succeeded && job?.outputUrl && (
          <div className="rounded-2xl border border-emerald-500/30 bg-white p-3">
            <MessageMediaBlock url={job.outputUrl} kind="video" />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-emerald-700">
                Video ready{provider ? ` · generated with ${provider}` : ""}.
              </span>
              <button type="button" onClick={onDismissResult} className="text-accent hover:underline">
                Make another
              </button>
            </div>
          </div>
        )}

        {failed && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>{job?.errorMessage || error}</span>
            <Button type="button" size="sm" variant="secondary" onClick={onRetry} disabled={!canGenerate}>
              <RefreshCw className="h-4 w-4" aria-hidden /> Try again
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="video"
          size="lg"
          disabled={disabled}
          onClick={onGenerate}
          className="w-full min-h-14 text-lg sm:w-auto"
        >
          {processing ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden /> Generating…
            </>
          ) : (
            <>
              <Video className="h-6 w-6" aria-hidden /> Generate video
            </>
          )}
        </Button>
        <p className="text-sm text-muted">
          <Clapperboard className="mr-1 inline h-4 w-4" aria-hidden />
          {creditCost} credits per video
          {creditsAvailable !== null ? ` · ${creditsAvailable} available` : ""} · refunded
          automatically if it fails
        </p>
      </div>
    </div>
  );
}
