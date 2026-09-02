"use client";

import { GenerationProgressStrip } from "@/components/generation/GenerationProgressStrip";
import { MessageMediaBlock } from "@/components/chat/MessageMediaBlock";
import { Button } from "@/components/ui/Button";
import {
  useMediaGeneration,
  type ImageGenerationOptions,
} from "@/hooks/useMediaGeneration";
import { useGenerationStages } from "@/hooks/useGenerationStages";
import { useMediaVideoJob } from "@/hooks/useMediaVideoJob";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { VideoGenerateForm, type VideoFormValues } from "@/components/media/VideoGenerateForm";
import { getRecentImageUrls, subscribeRecentImageUrls } from "@/lib/media/jobsRefresh";
import {
  IMAGE_CATEGORIES,
  VIDEO_CATEGORIES,
  type ImageCategoryId,
  type VideoCategoryId,
} from "@/lib/media/catalog";
import {
  type ImageStudioActionId,
  imageStudioActionRequiresSource,
} from "@/lib/chat/imageStudioLinks";
import type { UsageSnapshot } from "@/lib/credits/constants";
import { CreditPromptBanner } from "@/components/billing/CreditPromptBanner";
import { canGenerateImage, canGenerateVideo } from "@/lib/credits/rules";
import { cn } from "@/lib/utils";
import { CheckCircle2, ImageIcon, Loader2, Video, XCircle } from "lucide-react";
import Link from "next/link";
import { memo, useCallback, useEffect, useState, useSyncExternalStore } from "react";

interface MediaGeneratePanelProps {
  usage: UsageSnapshot | null;
  initialTab: "image" | "video";
  initialCategory: string;
  initialPrompt: string;
  initialSourceImageUrl?: string;
  initialAction?: ImageStudioActionId | null;
  initialImageSize?: NonNullable<ImageGenerationOptions["imageSize"]>;
}

type CreatorCanvasSize =
  | "a4"
  | "a3"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "linkedin";

const CREATOR_CANVAS_OPTIONS: Array<{ id: CreatorCanvasSize; label: string }> = [
  { id: "a4", label: "A4" },
  { id: "a3", label: "A3" },
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube Thumbnail" },
  { id: "linkedin", label: "LinkedIn" },
];

function imageSizeFromCanvas(
  size: CreatorCanvasSize
): NonNullable<ImageGenerationOptions["imageSize"]> {
  switch (size) {
    case "a3":
      return "landscape_4_3";
    case "facebook":
    case "linkedin":
    case "youtube":
      return "landscape_16_9";
    case "instagram":
      return "square_hd";
    case "tiktok":
      return "portrait_16_9";
    case "a4":
    default:
      return "portrait_4_3";
  }
}

export const MediaGeneratePanel = memo(function MediaGeneratePanel({
  usage,
  initialTab,
  initialCategory,
  initialPrompt,
  initialSourceImageUrl = "",
  initialAction = null,
  initialImageSize = "square_hd",
}: MediaGeneratePanelProps) {
  useRenderDiagnostic("MediaGeneratePanel");

  const {
    loading,
    phase,
    error,
    successMessage,
    lastOutputUrl,
    lastMediaType,
    clearStatus,
    createImage,
    createVideo,
    resolveVideoJob,
  } = useMediaGeneration();
  const videoJob = useMediaVideoJob();
  const recentImageUrls = useSyncExternalStore(
    subscribeRecentImageUrls,
    getRecentImageUrls,
    () => [] as string[]
  );

  const [tab, setTab] = useState<"image" | "video">(initialTab);
  const generationStage = useGenerationStages(loading, tab);

  const [category, setCategory] = useState(initialCategory);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [imageSourceUrl, setImageSourceUrl] = useState(initialSourceImageUrl);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [imageSize, setImageSize] =
    useState<NonNullable<ImageGenerationOptions["imageSize"]>>(initialImageSize);
  const [imageQuality, setImageQuality] = useState<"standard" | "high" | "ultra">("high");
  const [transparentBackground, setTransparentBackground] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [seed, setSeed] = useState("");
  const [creatorCanvasSize, setCreatorCanvasSize] = useState<CreatorCanvasSize>("a4");
  const [videoForm, setVideoForm] = useState<VideoFormValues>({
    prompt: initialTab === "video" ? initialPrompt : "",
    category: (VIDEO_CATEGORIES.some((c) => c.id === initialCategory)
      ? initialCategory
      : "cinematic_trailers") as VideoCategoryId,
    sourceImageUrl: initialTab === "video" ? initialSourceImageUrl : "",
    aspectRatio: "16:9",
    durationSec: 5,
    quality: "720p",
    audio: true,
  });
  const [videoSubmitting, setVideoSubmitting] = useState(false);
  const [lastVideoRequest, setLastVideoRequest] = useState<VideoFormValues | null>(null);

  const submitVideo = useCallback(
    async (form: VideoFormValues) => {
      const trimmed = form.prompt.trim();
      if (!trimmed) return;
      setVideoSubmitting(true);
      setLastVideoRequest(form);
      videoJob.clear();
      const result = await createVideo(
        form.category,
        trimmed,
        form.sourceImageUrl.trim() || undefined,
        {
          aspectRatio: form.aspectRatio,
          duration: form.durationSec,
          resolution: form.quality,
          generateAudio: form.audio,
        }
      );
      setVideoSubmitting(false);
      if (result?.jobId) videoJob.track(result.jobId);
    },
    [createVideo, videoJob]
  );

  // Hand the terminal job state back to the generation hook (success/error banners, history refresh).
  useEffect(() => {
    const job = videoJob.job;
    if (!job || job.status === "processing") return;
    if (job.status === "succeeded") {
      resolveVideoJob({
        status: "succeeded",
        outputUrl: job.outputUrl,
        prompt: lastVideoRequest?.prompt,
        category: lastVideoRequest?.category,
      });
    } else if (job.status === "failed") {
      resolveVideoJob({ status: "failed", errorMessage: job.errorMessage });
    }
  }, [videoJob.job, resolveVideoJob, lastVideoRequest]);

  const editActionActive =
    tab === "image" &&
    Boolean(initialAction && imageStudioActionRequiresSource(initialAction));
  const showImageSourceField =
    tab === "image" && (Boolean(imageSourceUrl.trim()) || editActionActive);

  const categories = tab === "image" ? IMAGE_CATEGORIES : VIDEO_CATEGORIES;
  const canGen =
    usage &&
    (tab === "image" ? canGenerateImage(usage) : canGenerateVideo(usage));

  const handleGenerate = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    const seedValue = Number(seed);
    const parsedSeed = seed.trim() && Number.isFinite(seedValue) ? seedValue : undefined;
    {
      const canvasLabel =
        CREATOR_CANVAS_OPTIONS.find((option) => option.id === creatorCanvasSize)
          ?.label ?? "A4";
      const qualitySuffix =
        imageQuality === "ultra"
          ? " Ultra-realistic 4K detail, refined lighting, accurate text rendering, consistent faces, crisp background quality, transparent background when requested."
          : imageQuality === "high"
            ? " High-detail composition, realistic lighting, clean text rendering, consistent subjects, polished background."
            : "";
      const imagePrompt = `${trimmed}${qualitySuffix} Target canvas size: ${canvasLabel}.${transparentBackground ? " Use a clean transparent or isolated background when the provider supports it." : ""}`;
      await createImage(
        category as ImageCategoryId,
        imagePrompt,
        imageSourceUrl || undefined,
        {
          imageSize: imageSizeFromCanvas(creatorCanvasSize) ?? imageSize,
          negativePrompt: negativePrompt.trim() || undefined,
          seed: parsedSeed,
          numInferenceSteps:
            imageQuality === "ultra" ? 32 : imageQuality === "high" ? 16 : undefined,
          guidanceScale: imageQuality === "ultra" ? 7.5 : undefined,
          enableSafetyChecker: true,
        }
      );
    }
  }, [
    category,
    prompt,
    imageSourceUrl,
    seed,
    imageQuality,
    transparentBackground,
    imageSize,
    negativePrompt,
    creatorCanvasSize,
    createImage,
  ]);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            setTab("image");
            setCategory("anime_art");
            clearStatus();
            videoJob.clear();
          }}
          className={cn(
            "inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl px-6 py-4 text-lg font-bold",
            tab === "image" ? "btn-media-image-active shadow-lg" : "btn-media-inactive"
          )}
        >
          <ImageIcon className="h-7 w-7" aria-hidden />
          Images
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("video");
            clearStatus();
          }}
          className={cn(
            "inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl px-6 py-4 text-lg font-bold",
            tab === "video" ? "btn-media-video-active shadow-lg" : "btn-media-inactive"
          )}
        >
          <Video className="h-7 w-7" aria-hidden />
          Videos
        </button>
      </div>

      <div className="saas-card space-y-6 p-6 shadow-premium sm:p-8">
        {tab === "video" ? (
          <VideoGenerateForm
            values={videoForm}
            onChange={(patch) => setVideoForm((prev) => ({ ...prev, ...patch }))}
            onGenerate={() => void submitVideo(videoForm)}
            onRetry={() => void submitVideo(lastVideoRequest ?? videoForm)}
            onDismissResult={() => {
              videoJob.clear();
              clearStatus();
            }}
            canGenerate={Boolean(canGen)}
            creditCost={usage?.creditCosts.video ?? 8}
            creditsAvailable={usage ? usage.credits : null}
            submitting={videoSubmitting}
            job={videoJob.job}
            jobStartedAt={videoJob.startedAt}
            error={error}
            recentImageUrls={recentImageUrls}
          />
        ) : (
          <>
        {editActionActive && initialAction && (
          <p className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-foreground">
            Image edit mode:{" "}
            <span className="font-semibold capitalize">
              {initialAction.replace(/-/g, " ")}
            </span>
            {!imageSourceUrl.trim() && (
              <span className="mt-1 block text-muted">
                Paste a source image URL below to run this edit.
              </span>
            )}
          </p>
        )}

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder={`Describe your ${tab}…`}
          className="input-surface sm:text-lg"
        />

        <div id="advanced-creator-controls" className="rounded-2xl border border-border bg-card/60">
          <button
            type="button"
            onClick={() => setAdvancedOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-bold uppercase tracking-wide text-muted"
          >
            Creative options
            <span className="text-xs font-medium normal-case text-accent">
              {advancedOpen
                ? "Hide"
                : `${categories.find((item) => item.id === category)?.label ?? "Style"} · ${imageQuality}`}
            </span>
          </button>

          {advancedOpen && (
            <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
              <fieldset className="space-y-2 sm:col-span-2">
                <legend className="text-sm font-semibold text-foreground">Style</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {categories.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={category === item.id}
                      onClick={() => setCategory(item.id)}
                      className={cn(
                        "min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold",
                        category === item.id
                          ? "border-accent bg-accent/15 text-foreground"
                          : "border-border text-muted hover:border-violet-500/40 hover:text-foreground"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="space-y-2 text-sm font-semibold text-foreground">
                Quality target
                <select
                  value={imageQuality}
                  onChange={(e) =>
                    setImageQuality(e.target.value as typeof imageQuality)
                  }
                  className="input-surface py-2 text-sm"
                >
                  <option value="standard">Fast standard</option>
                  <option value="high">High detail</option>
                  <option value="ultra">Ultra / 4K-style prompt</option>
                </select>
              </label>

              <label className="space-y-2 text-sm font-semibold text-foreground">
                Canvas / preset size
                <select
                  value={creatorCanvasSize}
                  onChange={(e) =>
                    setCreatorCanvasSize(e.target.value as CreatorCanvasSize)
                  }
                  className="input-surface py-2 text-sm"
                >
                  {CREATOR_CANVAS_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

                              <label className="space-y-2 text-sm font-semibold text-foreground">
                  Image format
                  <select
                    value={imageSize}
                    onChange={(e) =>
                      setImageSize(e.target.value as typeof imageSize)
                    }
                    className="input-surface py-2 text-sm"
                  >
                    <option value="square_hd">Square HD</option>
                    <option value="portrait_16_9">Portrait</option>
                    <option value="landscape_16_9">Landscape</option>
                    <option value="portrait_4_3">Social portrait</option>
                    <option value="landscape_4_3">Social landscape</option>
                  </select>
                </label>

              
              {tab === "image" && (
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={transparentBackground}
                    onChange={(e) => setTransparentBackground(e.target.checked)}
                  />
                  Request transparent / isolated background
                </label>
              )}

              <label className="space-y-2 text-sm font-semibold text-foreground sm:col-span-2">
                Negative prompt
                <input
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="Avoid blur, distorted hands, wrong text, low quality..."
                  className="input-surface py-2 text-sm"
                />
              </label>

              <label className="space-y-2 text-sm font-semibold text-foreground">
                Seed (optional)
                <input
                  value={seed}
                  onChange={(e) => setSeed(e.target.value.replace(/[^\d]/g, ""))}
                  inputMode="numeric"
                  placeholder="Reuse for consistency"
                  className="input-surface py-2 text-sm"
                />
              </label>
            </div>
          )}
        </div>

        {showImageSourceField && (
          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-wide text-muted">
              Source image (edit mode — Replicate Kontext + Google AI Studio)
            </label>
            <input
              type="url"
              value={imageSourceUrl}
              onChange={(e) => setImageSourceUrl(e.target.value)}
              placeholder="https://… — edit, remove background, style transfer"
              className="w-full rounded-xl border border-border bg-black/40 px-4 py-3 text-base outline-none ring-accent focus:ring-2"
            />
            {imageSourceUrl.startsWith("http") && (
              <MessageMediaBlock url={imageSourceUrl} kind="image" />
            )}
          </div>
        )}

        
        {phase === "success" && lastOutputUrl && lastMediaType && (
          <div className="rounded-2xl border border-emerald-500/30 bg-white p-3">
            <MessageMediaBlock
              url={lastOutputUrl}
              kind={lastMediaType === "video" ? "video" : "image"}
            />
          </div>
        )}

        <div className="min-h-[5.5rem] space-y-3" aria-live="polite">
          {loading && (
            <GenerationProgressStrip
              label={generationStage.label}
              progress={generationStage.progress}
              state="processing"
            />
          )}

          {phase === "success" && successMessage && !loading && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-base text-emerald-100"
            >
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" aria-hidden />
              <span>{successMessage}</span>
            </div>
          )}

          {error && !loading && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-base text-red-100"
            >
              <XCircle className="mt-0.5 h-6 w-6 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}
        </div>

        {!canGen && usage && (
          <CreditPromptBanner
            variant="empty"
            message="Daily image limit reached or you need more credits to generate."
            subscriptionActive={usage.subscriptionActive}
            creditCost={usage.creditCosts.image}
            compact
          />
        )}

        <Button
          type="button"
          variant="image"
          size="lg"
          disabled={
            loading ||
            !canGen ||
            !prompt.trim() ||
            (editActionActive && !imageSourceUrl.trim())
          }
          onClick={() => void handleGenerate()}
          className="w-full min-h-14 text-lg sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden /> Generating…
            </>
          ) : (
            <>
              <ImageIcon className="h-6 w-6" aria-hidden /> Generate image
            </>
          )}
        </Button>

          </>
        )}
        {tab === "video" && !canGen && usage && (
          <CreditPromptBanner
            variant="empty"
            message={`You need ${usage.creditCosts.video} credits for a video. Subscribe or buy a top-up pack to continue.`}
            subscriptionActive={usage.subscriptionActive}
            creditCost={usage.creditCosts.video}
            compact
          />
        )}
      </div>
    </>
  );
});
