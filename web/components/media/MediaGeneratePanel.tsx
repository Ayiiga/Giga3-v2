"use client";

import { MessageMediaBlock } from "@/components/chat/MessageMediaBlock";
import { Button } from "@/components/ui/Button";
import { useMediaGeneration } from "@/hooks/useMediaGeneration";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import {
  IMAGE_CATEGORIES,
  VIDEO_CATEGORIES,
  type ImageCategoryId,
  type VideoCategoryId,
} from "@/lib/media/catalog";
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
}

export const MediaGeneratePanel = memo(function MediaGeneratePanel({
  usage,
  initialTab,
  initialCategory,
  initialPrompt,
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

  const [tab, setTab] = useState<"image" | "video">(initialTab);
  const [category, setCategory] = useState(initialCategory);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [videoImageUrl, setVideoImageUrl] = useState("");

  const categories = tab === "image" ? IMAGE_CATEGORIES : VIDEO_CATEGORIES;
  const canGen =
    usage &&
    (tab === "image" ? canGenerateImage(usage) : canGenerateVideo(usage));

  const handleGenerate = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    if (tab === "image") {
      await createImage(category as ImageCategoryId, trimmed);
    } else {
      await createVideo(
        category as VideoCategoryId,
        trimmed,
        videoImageUrl || undefined
      );
    }
  }, [tab, category, prompt, videoImageUrl, createImage, createVideo]);

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

        {tab === "video" && (
          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-wide text-muted">
              Source image URL (optional)
            </label>
            <input
              type="url"
              value={videoImageUrl}
              onChange={(e) => setVideoImageUrl(e.target.value)}
              placeholder="https://… — improves quality; text-only uses backup provider"
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
            <div
              role="status"
              className="rounded-2xl border border-violet-500/30 bg-violet-500/10 px-4 py-4"
            >
              <div className="flex items-center gap-3 text-base font-medium text-violet-100">
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                Generating your {tab}…
              </div>
            </div>
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
          disabled={loading || !canGen || !prompt.trim()}
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
