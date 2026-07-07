"use client";

import { MediaGeneratePanel } from "@/components/media/MediaGeneratePanel";
import { MediaQuickTemplates } from "@/components/media/MediaQuickTemplates";
import { RecentGenerationsSection } from "@/components/media/RecentGenerationsSection";
import type { UsageSnapshot } from "@/lib/credits/constants";
import { IMAGE_ASPECT_RATIOS, IMAGE_STYLES } from "@/lib/creator-studio/tools";
import type { ImageGenerationOptions } from "@/hooks/useMediaGeneration";
import { memo, useState } from "react";

interface CreatorImagePanelProps {
  usage: UsageSnapshot | null;
  email: string;
  mounted: boolean;
}

export const CreatorImagePanel = memo(function CreatorImagePanel({
  usage,
  email,
  mounted,
}: CreatorImagePanelProps) {
  const [revision, setRevision] = useState(0);
  const [category, setCategory] = useState("social_graphics");
  const [prompt, setPrompt] = useState("");
  const [imageSize, setImageSize] =
    useState<NonNullable<ImageGenerationOptions["imageSize"]>>("square_hd");

  return (
    <div className="space-y-8">
      <div className="saas-card rounded-2xl border border-border p-4 sm:p-5">
        <h3 className="text-base font-semibold text-foreground">Quick image setup</h3>
        <p className="mt-1 text-sm text-muted">
          Choose style, aspect ratio, and prompt — then generate below. Uses the Media Studio engine
          (fal.ai → Replicate → Google AI Studio).
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-2 block text-xs font-medium text-muted">Style</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
            >
              {IMAGE_STYLES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-muted">Aspect ratio</label>
            <select
              value={imageSize}
              onChange={(e) =>
                setImageSize(e.target.value as NonNullable<ImageGenerationOptions["imageSize"]>)
              }
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
            >
              {IMAGE_ASPECT_RATIOS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-1">
            <label className="mb-2 block text-xs font-medium text-muted">Prompt</label>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Poster, logo, flyer, educational visual…"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <MediaGeneratePanel
        key={`${revision}-${imageSize}`}
        usage={usage}
        initialTab="image"
        initialCategory={category}
        initialPrompt={prompt}
        initialImageSize={imageSize}
      />

      <MediaQuickTemplates
        onApply={(template) => {
          setCategory(template.category);
          setPrompt(template.prompt);
          setRevision((r) => r + 1);
        }}
      />

      <RecentGenerationsSection userId={email} mounted={mounted} />
    </div>
  );
});
