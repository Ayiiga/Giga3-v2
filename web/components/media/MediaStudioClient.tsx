"use client";

import { CreditBadge } from "@/components/billing/CreditBadge";
import { UsageTracker } from "@/components/billing/UsageTracker";
import { MediaErrorBoundary } from "@/components/media/MediaErrorBoundary";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/Button";
import { useBilling } from "@/hooks/useBilling";
import { useMediaGeneration } from "@/hooks/useMediaGeneration";
import {
  IMAGE_CATEGORIES,
  VIDEO_CATEGORIES,
  type ImageCategoryId,
  type VideoCategoryId,
} from "@/lib/media/catalog";
import { canGenerateImage, canGenerateVideo } from "@/lib/credits/rules";
import { cn } from "@/lib/utils";
import { AlertCircle, ImageIcon, Loader2, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function MediaStudioClientInner() {
  const router = useRouter();
  const { email, usage } = useBilling();
  const { jobs, jobsLoading, loading, error, createImage, createVideo } =
    useMediaGeneration();
  const [tab, setTab] = useState<"image" | "video">("image");
  const [category, setCategory] = useState<string>("anime_art");
  const [prompt, setPrompt] = useState("");
  const [videoImageUrl, setVideoImageUrl] = useState("");

  useEffect(() => {
    if (!email) router.replace("/chat/login?next=/media");
  }, [email, router]);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    try {
      if (tab === "image") {
        await createImage(category as ImageCategoryId, prompt);
      } else {
        await createVideo(category as VideoCategoryId, prompt, videoImageUrl);
      }
      setPrompt("");
    } catch {
      /* hook sets error state */
    }
  }

  const categories = tab === "image" ? IMAGE_CATEGORIES : VIDEO_CATEGORIES;
  const canGen =
    usage &&
    (tab === "image" ? canGenerateImage(usage) : canGenerateVideo(usage));
  const videoReady = tab !== "video" || videoImageUrl.trim().length > 0;

  if (!email) {
    return <p className="text-center text-muted">Redirecting…</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Media Studio</h1>
          <p className="mt-2 text-muted">
            Powered by Replicate · Images & videos with category presets
          </p>
        </div>
        {usage ? (
          <CreditBadge credits={usage.credits} />
        ) : (
          <span className="inline-flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading account…
          </span>
        )}
      </div>

      {usage && <UsageTracker usage={usage} />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            setTab("image");
            setCategory("anime_art");
          }}
          className={cn(
            "inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl px-6 py-3 text-base font-semibold transition-all",
            tab === "image" ? "btn-media-image-active" : "btn-media-inactive"
          )}
        >
          <ImageIcon aria-hidden />
          Images
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("video");
            setCategory("anime_videos");
          }}
          className={cn(
            "inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl px-6 py-3 text-base font-semibold transition-all",
            tab === "video" ? "btn-media-video-active" : "btn-media-inactive"
          )}
        >
          <Video aria-hidden />
          Videos
        </button>
      </div>

      <div className="glass space-y-6 rounded-2xl p-6 sm:p-8">
        <label className="text-sm font-semibold uppercase tracking-wide text-muted">
          Category
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={cn(
                "min-h-11 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                category === c.id
                  ? "border-accent bg-accent/15 text-foreground shadow-sm"
                  : "border-border text-muted hover:border-violet-500/40 hover:text-foreground"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {tab === "video" && (
          <div>
            <label htmlFor="video-source-url" className="mb-1.5 block text-sm font-medium">
              Source image URL
            </label>
            <input
              id="video-source-url"
              type="url"
              value={videoImageUrl}
              onChange={(e) => setVideoImageUrl(e.target.value)}
              placeholder="https://… (image to animate)"
              className="w-full rounded-xl border border-border bg-black/40 px-4 py-3 text-base outline-none ring-accent focus:ring-2"
            />
            <p className="mt-1.5 text-xs text-muted">
              Video generation uses an existing image as the starting frame.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="media-prompt" className="mb-1.5 block text-sm font-medium">
            Prompt
          </label>
          <textarea
            id="media-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder={`Describe your ${tab}…`}
            className="w-full rounded-xl border border-border bg-black/40 px-4 py-3 text-base outline-none ring-accent focus:ring-2"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        {!canGen && usage && (
          <p className="text-sm text-amber-300">
            {tab === "video"
              ? "Premium + credits required for video."
              : "Daily image limit reached or insufficient credits."}{" "}
            <ButtonLink href="/credits" variant="ghost" size="sm">
              Get credits
            </ButtonLink>
          </p>
        )}

        <Button
          type="button"
          variant={tab === "video" ? "video" : "image"}
          size="lg"
          disabled={loading || !canGen || !prompt.trim() || !videoReady}
          onClick={() => void handleGenerate()}
          className="w-full sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" aria-hidden /> Generating…
            </>
          ) : tab === "video" ? (
            <>
              <Video aria-hidden /> Generate video
            </>
          ) : (
            <>
              <ImageIcon aria-hidden /> Generate image
            </>
          )}
        </Button>
      </div>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold tracking-tight">Recent generations</h2>
        {jobsLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading history…
          </p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-muted">No media yet — create your first above.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {jobs.map((job) => (
              <article key={job._id} className="glass overflow-hidden rounded-xl">
                {job.status === "processing" && (
                  <div className="flex aspect-video items-center justify-center bg-black/30 text-sm text-muted">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
                    Generating…
                  </div>
                )}
                {job.status === "failed" && (
                  <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-red-500/10 px-4 text-center text-sm text-red-200">
                    <AlertCircle className="h-6 w-6" aria-hidden />
                    <span>{job.errorMessage ?? "Generation failed"}</span>
                  </div>
                )}
                {job.status === "succeeded" && job.outputUrl && job.mediaType === "image" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={job.outputUrl}
                    alt=""
                    className="aspect-video w-full object-cover"
                  />
                )}
                {job.status === "succeeded" && job.outputUrl && job.mediaType === "video" && (
                  <video src={job.outputUrl} controls className="aspect-video w-full" />
                )}
                <div className="p-3 text-xs">
                  <p className="font-medium capitalize">
                    {job.mediaType} · {job.status}
                  </p>
                  <p className="mt-1 line-clamp-2 text-muted">{job.prompt}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function MediaStudioClient() {
  return (
    <ConvexAppShell>
      <MediaErrorBoundary>
        <MediaStudioClientInner />
      </MediaErrorBoundary>
    </ConvexAppShell>
  );
}
