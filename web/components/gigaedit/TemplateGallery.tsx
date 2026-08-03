"use client";

import { GIGAEDIT_TEMPLATES } from "@/lib/gigaedit/templates";
import { createEmptyProject, saveGigaEditProject } from "@/lib/gigaedit/projects";
import type { GigaEditOpenOptions } from "@/lib/gigaedit/types";
import { useState } from "react";

type TemplateGalleryProps = {
  onUseVideo: (opts?: GigaEditOpenOptions) => void;
  onUsePhoto: (opts?: GigaEditOpenOptions) => void;
};

export function TemplateGallery({ onUseVideo, onUsePhoto }: TemplateGalleryProps) {
  const [status, setStatus] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Templates</h2>
        <p className="mt-1 text-xs text-[var(--ge-muted)]">
          Downloaded layouts work offline and open the matching editor with the template aspect
          ratio seeded.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {GIGAEDIT_TEMPLATES.map((t) => (
          <article key={t.id} className="gigaedit-glass flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold">{t.title}</h3>
              <span className="rounded-full border border-[var(--ge-border)] px-2 py-0.5 text-[10px] text-[var(--ge-muted)]">
                {t.aspectRatio}
              </span>
            </div>
            <p className="text-xs text-[var(--ge-muted)]">{t.description}</p>
            <p className="text-[10px] uppercase tracking-wide text-[var(--ge-gold)]">
              {t.offline ? "Offline ready" : "Online"}
              {t.aiLabel ? " · AI-assisted option" : ""}
            </p>
            <button
              type="button"
              className="mt-auto rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs font-medium"
              onClick={() =>
                void (async () => {
                  const project = createEmptyProject({
                    kind: t.category === "photo" || t.category === "business" ? "photo" : "video",
                    title: t.title,
                    aspectRatio: t.aspectRatio,
                  });
                  project.aiAssisted = t.aiLabel;
                  project.notes = t.id;
                  project.overlayText = t.title;
                  await saveGigaEditProject(project);
                  setStatus(`Template “${t.title}” opened (${t.aspectRatio}).`);
                  const opts = { projectId: project.id, aspect: t.aspectRatio };
                  if (t.category === "photo" || t.category === "business") onUsePhoto(opts);
                  else onUseVideo(opts);
                })()
              }
            >
              Use template
            </button>
          </article>
        ))}
      </div>
      {status ? <p className="text-xs text-[var(--ge-gold)]">{status}</p> : null}
    </div>
  );
}
