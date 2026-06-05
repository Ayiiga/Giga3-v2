"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { MediaErrorBoundary } from "@/components/media/MediaErrorBoundary";
import { CreditBadge } from "@/components/billing/CreditBadge";
import { UsageTracker } from "@/components/billing/UsageTracker";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useBilling } from "@/hooks/useBilling";
import { useMediaGeneration } from "@/hooks/useMediaGeneration";
import {
  IMAGE_CATEGORIES,
  VIDEO_CATEGORIES,
  type ImageCategoryId,
  type VideoCategoryId,
} from "@/lib/media/catalog";
import {
  buildMediaStudioUrl,
  getMediaStudioTemplate,
  MEDIA_STUDIO_TEMPLATES,
} from "@/lib/media/studioTemplates";
import { canGenerateImage, canGenerateVideo } from "@/lib/credits/rules";
import { cn } from "@/lib/utils";
import { MessageMediaBlock } from "@/components/chat/MessageMediaBlock";
import { RecentGenerationsList } from "@/components/media/RecentGenerationsList";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { CheckCircle2, ImageIcon, Loader2, Video, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function MediaStudioContent() {
  useRenderDiagnostic("MediaStudioContent");
  const router = useRouter();
  const params = useSearchParams();
  const { email, usage } = useBilling();
  const {
    jobs,
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

  const initialTab = params.get("tab") === "video" ? "video" : "image";
  const initialCategory = params.get("category") ?? "anime_art";
  const initialPrompt = params.get("prompt") ?? "";

  const [tab, setTab] = useState<"image" | "video">(initialTab);
  const [category, setCategory] = useState<string>(initialCategory);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [videoImageUrl, setVideoImageUrl] = useState("");

  useEffect(() => {
    if (!email) router.replace("/chat/login?next=/media");
  }, [email, router]);

  useEffect(() => {
    const templateId = params.get("template");
    if (!templateId) return;
    const template = getMediaStudioTemplate(templateId);
    if (!template) return;
    setTab(template.tab);
    setCategory(template.category);
    setPrompt(template.prompt);
  }, [params]);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    try {
      if (tab === "image") {
        await createImage(category as ImageCategoryId, prompt);
      } else {
        await createVideo(
          category as VideoCategoryId,
          prompt,
          videoImageUrl || undefined
        );
      }
    } catch {
      /* Errors surfaced via useMediaGeneration */
    }
  }

  function applyTemplate(templateId: string) {
    const template = getMediaStudioTemplate(templateId);
    if (!template) return;
    setTab(template.tab);
    setCategory(template.category);
    setPrompt(template.prompt);
    clearStatus();
    try {
      router.replace(buildMediaStudioUrl(template), { scroll: false });
    } catch {
      /* URL update optional */
    }
  }

  const categories = tab === "image" ? IMAGE_CATEGORIES : VIDEO_CATEGORIES;
  const canGen =
    usage &&
    (tab === "image" ? canGenerateImage(usage) : canGenerateVideo(usage));

  if (!email) {
    return <p className="text-center text-base text-muted">Redirecting…</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Media Studio
          </h1>
          <p className="mt-3 text-base text-muted sm:text-lg">
            AI images & videos · fal.ai with automatic fallback
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {usage && <CreditBadge credits={usage.credits} />}
          <ButtonLink href="/chat" variant="outline" size="md">
            Back to chat
          </ButtonLink>
        </div>
      </div>

      {usage && <UsageTracker usage={usage} />}

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground sm:text-xl">Quick templates</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {MEDIA_STUDIO_TEMPLATES.map((template) => {
            const Icon = template.icon;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template.id)}
                className={cn(
                  "saas-card flex min-h-[5rem] items-center gap-3 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-premium",
                  params.get("template") === template.id && "ring-2 ring-violet-500/50"
                )}
              >
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br",
                    template.gradient
                  )}
                >
                  <Icon className="h-6 w-6 text-white" aria-hidden />
                </div>
                <span>
                  <span className="block text-base font-semibold">{template.title}</span>
                  <span className="text-sm text-muted">{template.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            setTab("image");
            setCategory("anime_art");
            clearStatus();
          }}
          className={cn(
            "inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl px-6 py-4 text-lg font-bold transition-all",
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
            "inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl px-6 py-4 text-lg font-bold transition-all",
            tab === "video" ? "btn-media-video-active shadow-lg" : "btn-media-inactive"
          )}
        >
          <Video className="h-7 w-7" aria-hidden />
          Videos
        </button>
      </div>

      <div className="saas-card space-y-6 p-6 shadow-premium sm:p-8">
        <label className="text-sm font-bold uppercase tracking-wide text-muted">Category</label>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={cn(
                "min-h-12 rounded-xl border px-3 py-3 text-sm font-semibold transition-all sm:text-base",
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

      <RecentGenerationsList jobs={jobs} />
    </div>
  );
}

function MediaStudioClientInner() {
  return (
    <Suspense fallback={<p className="text-center text-base text-muted">Loading studio…</p>}>
      <MediaStudioContent />
    </Suspense>
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
