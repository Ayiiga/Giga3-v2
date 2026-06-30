"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useVideoWallet } from "@/hooks/useVideoAI";
import { VIDEO_AI_CATEGORIES, VIDEO_AI_COSTS } from "@/lib/video/catalog";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { Film, Loader2, Sparkles, Video } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function VideoStudioInner() {
  const router = useRouter();
  const { mounted, sessionToken, wallet, generateVideo } = useVideoWallet();
  const [category, setCategory] = useState("text_to_video");
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const jobs = useQuery(
    api.videoQueries.listJobs,
    mounted && sessionToken ? { sessionToken, limit: 12 } : "skip"
  );

  useEffect(() => {
    if (mounted && !sessionToken) {
      router.replace("/chat/login?next=/video");
    }
  }, [mounted, sessionToken, router]);

  if (!mounted || !sessionToken) {
    return <p className="text-center text-muted">Redirecting…</p>;
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);
    setResultUrl(null);
    try {
      const result = await generateVideo({
        category,
        prompt: prompt.trim(),
        imageUrl: imageUrl.trim() || undefined,
        aspectRatio: category === "social_reel" ? "9:16" : "16:9",
      });
      setResultUrl(result.videoUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Video generation failed");
    } finally {
      setGenerating(false);
    }
  }

  const cost = VIDEO_AI_COSTS[category] ?? 5;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1 text-sm font-medium text-violet-700 dark:text-violet-300">
            <Video className="h-4 w-4" aria-hidden />
            Independent Video AI
          </div>
          <h1 className="page-title">Video AI Studio</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Dedicated video generation with its own credits — never uses chat or image credits.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-border bg-card px-4 py-2 text-sm">
            <span className="text-muted">Video credits</span>{" "}
            <strong className="text-foreground">{wallet?.videoCredits ?? 0}</strong>
          </div>
          <ButtonLink href="/video/plans" size="sm">
            Buy video credits
          </ButtonLink>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {VIDEO_AI_CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCategory(item.id)}
            className={cn(
              "rounded-2xl border p-4 text-left transition-colors",
              category === item.id
                ? "border-violet-500 bg-violet-500/5"
                : "border-border bg-card hover:bg-accent/5"
            )}
          >
            <div className="font-medium">{item.label}</div>
            <div className="mt-1 text-sm text-muted">{item.description}</div>
            <div className="mt-2 text-xs font-medium text-violet-600 dark:text-violet-300">
              {VIDEO_AI_COSTS[item.id]} video credits
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <label className="block text-sm font-medium" htmlFor="video-prompt">
          Prompt
        </label>
        <textarea
          id="video-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder="Describe the video you want to create…"
          className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-violet-500/30"
        />
        {(category === "image_to_video" || category === "talking_avatar") && (
          <div className="mt-4">
            <label className="block text-sm font-medium" htmlFor="video-source">
              Source image URL
            </label>
            <input
              id="video-source"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-violet-500/30"
            />
          </div>
        )}
        {error && (
          <p className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={handleGenerate} disabled={generating || !prompt.trim()}>
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" aria-hidden />
                Generate ({cost} credits)
              </>
            )}
          </Button>
          <p className="text-sm text-muted">
            Uses Video AI credits only — separate from chat billing.
          </p>
        </div>
        {resultUrl && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-border">
            <video src={resultUrl} controls className="w-full bg-black" />
          </div>
        )}
      </div>

      {jobs && jobs.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Film className="h-5 w-5" aria-hidden />
            Recent videos
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {jobs.map((job) => (
              <article key={job._id} className="rounded-2xl border border-border bg-card p-4">
                <div className="text-sm font-medium capitalize">{job.category.replace(/_/g, " ")}</div>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{job.prompt}</p>
                {job.outputUrl && job.status === "succeeded" ? (
                  <video src={job.outputUrl} controls className="mt-3 w-full rounded-xl bg-black" />
                ) : (
                  <p className="mt-3 text-sm text-muted">{job.status}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      <p className="text-center text-sm text-muted">
        Image generation remains in{" "}
        <Link href="/media" className="text-violet-600 underline">
          Media Studio
        </Link>
        . Chat credits are not used here.
      </p>
    </div>
  );
}

export function VideoStudioClient() {
  return (
    <ConvexAppShell>
      <VideoStudioInner />
    </ConvexAppShell>
  );
}
