"use client";

import {
  getGigaEditMoreTemplates,
  getGigaEditStarterPackTemplates,
  type GigaEditTemplate,
} from "@/lib/gigaedit/templates";
import { createEmptyProject, saveGigaEditProject } from "@/lib/gigaedit/projects";
import type { GigaEditOpenOptions } from "@/lib/gigaedit/types";
import { useState } from "react";

type TemplateGalleryProps = {
  onUseVideo: (opts?: GigaEditOpenOptions) => void;
  onUsePhoto: (opts?: GigaEditOpenOptions) => void;
};

function isPhotoTemplate(t: GigaEditTemplate): boolean {
  return t.category === "photo" || t.category === "business";
}

export function TemplateGallery({ onUseVideo, onUsePhoto }: TemplateGalleryProps) {
  const [status, setStatus] = useState<string | null>(null);
  const starterPack = getGigaEditStarterPackTemplates();
  const moreTemplates = getGigaEditMoreTemplates();

  async function openTemplate(t: GigaEditTemplate) {
    const project = createEmptyProject({
      kind: isPhotoTemplate(t) ? "photo" : "video",
      title: t.title,
      aspectRatio: t.aspectRatio,
    });
    project.aiAssisted = t.aiLabel;
    project.notes = t.id;
    project.overlayText = t.title;
    await saveGigaEditProject(project);
    setStatus(`Opened “${t.title}” (${t.aspectRatio}) — import your media to continue.`);
    const opts = { projectId: project.id, aspect: t.aspectRatio };
    if (isPhotoTemplate(t)) onUsePhoto(opts);
    else onUseVideo(opts);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Templates</h2>
        <p className="mt-1 text-xs text-[var(--ge-muted)]">
          Each template opens the matching editor with the right aspect ratio and a starter title.
          Import your own photo or video — no paid AI call is required to begin.
        </p>
      </div>

      <section aria-labelledby="gigaedit-starter-pack-heading" className="space-y-3">
        <div>
          <h3 id="gigaedit-starter-pack-heading" className="text-sm font-semibold text-[var(--ge-gold)]">
            Creator Growth Starter Pack
          </h3>
          <p className="mt-1 text-xs text-[var(--ge-muted)]">
            Three free starters for aspiring creators: a vertical reel, a YouTube-sized video, and a
            promo poster. Works offline after the app loads.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {starterPack.map((t) => (
            <TemplateCard key={t.id} template={t} featured onUse={() => void openTemplate(t)} />
          ))}
        </div>
      </section>

      <section aria-labelledby="gigaedit-more-templates-heading" className="space-y-3">
        <h3 id="gigaedit-more-templates-heading" className="text-sm font-semibold">
          More templates
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {moreTemplates.map((t) => (
            <TemplateCard key={t.id} template={t} onUse={() => void openTemplate(t)} />
          ))}
        </div>
      </section>

      {status ? <p className="text-xs text-[var(--ge-gold)]">{status}</p> : null}
    </div>
  );
}

function TemplateCard({
  template: t,
  featured = false,
  onUse,
}: {
  template: GigaEditTemplate;
  featured?: boolean;
  onUse: () => void;
}) {
  return (
    <article
      className={
        featured
          ? "gigaedit-glass flex flex-col gap-2 border border-[var(--ge-gold)]/35 p-4"
          : "gigaedit-glass flex flex-col gap-2 p-4"
      }
      data-template-id={t.id}
      data-starter-pack={featured ? "true" : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold">{t.title}</h3>
        <span className="rounded-full border border-[var(--ge-border)] px-2 py-0.5 text-[10px] text-[var(--ge-muted)]">
          {t.aspectRatio}
        </span>
      </div>
      <p className="text-xs text-[var(--ge-muted)]">{t.description}</p>
      <p className="text-[10px] uppercase tracking-wide text-[var(--ge-gold)]">
        {t.offline ? "Offline ready" : "Online"}
        {t.aiLabel ? " · Optional AI-assisted tools in editor" : ""}
        {featured ? " · Starter Pack" : ""}
      </p>
      <button
        type="button"
        className="mt-auto rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs font-medium"
        onClick={onUse}
      >
        Use template
      </button>
    </article>
  );
}
