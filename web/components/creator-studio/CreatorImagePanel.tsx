"use client";

import { MediaGeneratePanel } from "@/components/media/MediaGeneratePanel";
import { MediaQuickTemplates } from "@/components/media/MediaQuickTemplates";
import { RecentGenerationsSection } from "@/components/media/RecentGenerationsSection";
import type { UsageSnapshot } from "@/lib/credits/constants";
import { IMAGE_ASPECT_RATIOS, IMAGE_STYLES } from "@/lib/creator-studio/tools";
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
  const [category, setCategory] = useState("social_graphic");
  const [prompt, setPrompt] = useState("");

  return (
    <div className="space-y-8">
      <div className="saas-card rounded-2xl border border-border p-4 sm:p-5">
        <h3 className="text-base font-semibold text-foreground">Quick image setup</h3>
        <p className="mt-1 text-sm text-muted">
          Choose a style and aspect ratio, then generate below. Uses the same reliable Media Studio
          engine (fal.ai → Replicate → Google AI Studio).
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
            <label className="mb-2 block text-xs font-medium text-muted">Starter prompt</label>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe poster, logo, or social graphic…"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          Aspect ratios available in Advanced controls:{" "}
          {IMAGE_ASPECT_RATIOS.map((r) => r.label).join(" · ")}
        </p>
      </div>

      <MediaGeneratePanel
        key={revision}
        usage={usage}
        initialTab="image"
        initialCategory={category}
        initialPrompt={prompt}
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
