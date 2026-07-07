"use client";

import { GenerationProgressStrip } from "@/components/generation/GenerationProgressStrip";
import { MessageMediaBlock } from "@/components/chat/MessageMediaBlock";
import { Button } from "@/components/ui/Button";
import {
  useMediaGeneration,
  type ImageGenerationOptions,
  type VideoGenerationOptions,
} from "@/hooks/useMediaGeneration";
import { useGenerationStages } from "@/hooks/useGenerationStages";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
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
import { canGenerateImage, canGenerateVideo } from "@/lib/credits/rules";
import { cn } from "@/lib/utils";
import { CheckCircle2, ImageIcon, Loader2, Video, XCircle } from "lucide-react";
import Link from "next/link";
import { memo, useCallback, useState } from "react";

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
  } = useMediaGeneration();

  const generationStage = useGenerationStages(loading, tab);

  const [tab, setTab] = useState<"image" | "video">(initialTab);
  const [category, setCategory] = useState(initialCategory);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [videoImageUrl, setVideoImageUrl] = useState("");
  const [imageSourceUrl, setImageSourceUrl] = useState(initialSourceImageUrl);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [imageSize, setImageSize] =
    useState<NonNullable<ImageGenerationOptions["imageSize"]>>(initialImageSize);
  const [imageQuality, setImageQuality] = useState<"standard" | "high" | "ultra">("high");
  const [transparentBackground, setTransparentBackground] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [seed, setSeed] = useState("");
  const [videoMode, setVideoMode] = useState<
    "text-to-video" | "image-to-video" | "story-to-video" | "animation" | "talking-avatar"
  >("text-to-video");
  const [videoAspectRatio, setVideoAspectRatio] =
    useState<NonNullable<VideoGenerationOptions["aspectRatio"]>>("16:9");
  const [videoDuration, setVideoDuration] = useState("7");
  const [videoResolution, setVideoResolution] = useState("720p");
  const [videoAudio, setVideoAudio] = useState(true);
  const [creatorCanvasSize, setCreatorCanvasSize] = useState<CreatorCanvasSize>("a4");

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
    if (tab === "image") {
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
    } else {
      const canvasLabel =
        CREATOR_CANVAS_OPTIONS.find((option) => option.id === creatorCanvasSize)
          ?.label ?? "A4";
      const modeInstruction = {
        "text-to-video": "Create a text-to-video clip with coherent motion and cinematic pacing.",
        "image-to-video": "Animate the source image naturally while preserving identity, composition, and lighting.",
        "story-to-video": "Convert this story into a concise multi-scene video with clear scene progression.",
        animation: "Create an AI animation with smooth movement and expressive timing.",
        "talking-avatar": "Create a talking-avatar style video prompt with presenter framing, lip-sync-ready script beats, and natural gestures.",
      }[videoMode];
      await createVideo(
        category as VideoCategoryId,
        `${modeInstruction} ${trimmed} Target output frame: ${canvasLabel}.`,
        videoImageUrl || undefined,
        {
          aspectRatio: videoAspectRatio,
          duration: Number(videoDuration) || undefined,
          resolution: videoResolution,
          generateAudio: videoAudio,
          negativePrompt: negativePrompt.trim() || undefined,
          seed: parsedSeed,
          numInferenceSteps: imageQuality === "ultra" ? 32 : undefined,
        }
      );
    }
  }, [
    tab,
    category,
    prompt,
    videoImageUrl,
    imageSourceUrl,
    seed,
    imageQuality,
    transparentBackground,
    imageSize,
    negativePrompt,
    videoMode,
    videoAspectRatio,
    videoDuration,
    videoResolution,
    videoAudio,
    creatorCanvasSize,
    createImage,
    createVideo,
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
            setCategory("anime_videos");
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

        <button
          type="button"
          onClick={() => {
            setAdvancedOpen(true);
            requestAnimationFrame(() =>
              document
                .getElementById("advanced-creator-controls")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            );
          }}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3 text-left text-sm font-bold text-foreground"
        >
          Advanced Creator controls
          <span className="text-xs font-medium text-accent">
            Quality · 4K · formats · video modes
          </span>
        </button>

        <label className="text-sm font-bold uppercase tracking-wide text-muted">
          Category
        </label>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={cn(
                "min-h-12 rounded-xl border px-3 py-3 text-sm font-semibold sm:text-base",
                category === c.id
                  ? "border-accent bg-accent/15 text-foreground shadow-md"
                  : "border-border text-muted hover:border-violet-500/40 hover:text-foreground"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

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
            Advanced Creator controls
            <span className="text-xs font-medium normal-case text-accent">
              {advancedOpen ? "Hide" : "Realism, 4K, formats, video modes"}
            </span>
          </button>

          {advancedOpen && (
            <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
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

              {tab === "image" ? (
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
              ) : (
                <label className="space-y-2 text-sm font-semibold text-foreground">
                  Video mode
                  <select
                    value={videoMode}
                    onChange={(e) =>
                      setVideoMode(e.target.value as typeof videoMode)
                    }
                    className="input-surface py-2 text-sm"
                  >
                    <option value="text-to-video">Text-to-video</option>
                    <option value="image-to-video">Image-to-video</option>
                    <option value="story-to-video">Story-to-video</option>
                    <option value="animation">AI animation</option>
                    <option value="talking-avatar">Talking avatar prompt</option>
                  </select>
                </label>
              )}

              {tab === "video" && (
                <>
                  <label className="space-y-2 text-sm font-semibold text-foreground">
                    Aspect ratio
                    <select
                      value={videoAspectRatio}
                      onChange={(e) =>
                        setVideoAspectRatio(e.target.value as typeof videoAspectRatio)
                      }
                      className="input-surface py-2 text-sm"
                    >
                      <option value="16:9">Landscape 16:9</option>
                      <option value="9:16">Shorts/TikTok 9:16</option>
                      <option value="1:1">Square 1:1</option>
                      <option value="4:3">Classic 4:3</option>
                      <option value="21:9">Cinematic 21:9</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-semibold text-foreground">
                    Duration
                    <select
                      value={videoDuration}
                      onChange={(e) => setVideoDuration(e.target.value)}
                      className="input-surface py-2 text-sm"
                    >
                      <option value="5">5 seconds</option>
                      <option value="7">7 seconds</option>
                      <option value="10">10 seconds</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-semibold text-foreground">
                    Resolution
                    <select
                      value={videoResolution}
                      onChange={(e) => setVideoResolution(e.target.value)}
                      className="input-surface py-2 text-sm"
                    >
                      <option value="720p">720p low-bandwidth</option>
                      <option value="1080p">1080p HD</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <input
                      type="checkbox"
                      checked={videoAudio}
                      onChange={(e) => setVideoAudio(e.target.checked)}
                    />
                    Generate synced audio when supported
                  </label>
                </>
              )}

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

        {tab === "video" && (
          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-wide text-muted">
              Source image URL (optional)
            </label>
            <input
              type="url"
              value={videoImageUrl}
              onChange={(e) => setVideoImageUrl(e.target.value)}
              placeholder="https://… — optional first frame for image-to-video (Seedance)"
              className="w-full rounded-xl border border-border bg-black/40 px-4 py-3 text-base outline-none ring-accent focus:ring-2"
            />
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
          <p className="text-base text-amber-200">
            {tab === "video"
              ? "Premium + credits required for video."
              : "Daily image limit reached or insufficient credits."}{" "}
            <Link href="/credits" className="font-semibold text-accent underline">
              Get credits
            </Link>
          </p>
        )}

        <Button
          type="button"
          variant={tab === "video" ? "video" : "image"}
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
          ) : tab === "video" ? (
            <>
              <Video className="h-6 w-6" aria-hidden /> Generate video
            </>
          ) : (
            <>
              <ImageIcon className="h-6 w-6" aria-hidden /> Generate image
            </>
          )}
        </Button>
      </div>
    </>
  );
});
