"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { CreditBadge } from "@/components/billing/CreditBadge";
import { UsageTracker } from "@/components/billing/UsageTracker";
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
import { ImageIcon, Loader2, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function MediaStudioClientInner() {
  const router = useRouter();
  const { email, usage } = useBilling();
  const { jobs, loading, error, createImage, createVideo } = useMediaGeneration();
  const [tab, setTab] = useState<"image" | "video">("image");
  const [category, setCategory] = useState<string>("anime_art");
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    if (!email) router.replace("/chat/login?next=/media");
  }, [email, router]);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    if (tab === "image") {
      await createImage(category as ImageCategoryId, prompt);
    } else {
      await createVideo(category as VideoCategoryId, prompt);
    }
    setPrompt("");
  }

  const categories = tab === "image" ? IMAGE_CATEGORIES : VIDEO_CATEGORIES;
  const canGen =
    usage &&
    (tab === "image" ? canGenerateImage(usage) : canGenerateVideo(usage));

  if (!email) {
    return <p className="text-center text-muted">Redirecting…</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Media Studio</h1>
          <p className="mt-1 text-sm text-muted">
            Powered by Replicate · Images & videos with category presets
          </p>
        </div>
        {usage && <CreditBadge credits={usage.credits} />}
      </div>

      {usage && <UsageTracker usage={usage} />}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setTab("image");
            setCategory("anime_art");
          }}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium",
            tab === "image" ? "bg-accent text-accent-foreground" : "glass text-muted"
          )}
        >
          <ImageIcon className="h-4 w-4" /> Images
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("video");
            setCategory("anime_videos");
          }}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium",
            tab === "video" ? "bg-accent text-accent-foreground" : "glass text-muted"
          )}
        >
          <Video className="h-4 w-4" /> Videos
        </button>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <label className="text-xs font-medium uppercase text-muted">Category</label>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs",
                category === c.id
                  ? "border-accent bg-accent/15"
                  : "border-border hover:border-violet-500/40"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder={`Describe your ${tab}…`}
          className="w-full rounded-xl border border-border bg-black/40 px-4 py-3 text-sm outline-none ring-accent focus:ring-2"
        />
        {error && <p className="text-sm text-red-300">{error}</p>}
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
          disabled={loading || !canGen || !prompt.trim()}
          onClick={() => void handleGenerate()}
          className="w-full sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Generating…
            </>
          ) : (
            `Generate ${tab}`
          )}
        </Button>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Recent generations</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {jobs.length === 0 && (
            <p className="text-sm text-muted">No media yet — create your first above.</p>
          )}
          {jobs.map((job) => (
            <article key={job._id} className="glass overflow-hidden rounded-xl">
              {job.outputUrl && job.mediaType === "image" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={job.outputUrl} alt="" className="aspect-video w-full object-cover" />
              )}
              {job.outputUrl && job.mediaType === "video" && (
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
      </section>
    </div>
  );
}

export function MediaStudioClient() {
  return (
    <ConvexAppShell>
      <MediaStudioClientInner />
    </ConvexAppShell>
  );
}
