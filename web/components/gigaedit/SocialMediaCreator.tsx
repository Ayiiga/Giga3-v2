"use client";

import { EXPORT_FORMATS } from "@/lib/gigaedit/types";
import { createEmptyProject, saveGigaEditProject } from "@/lib/gigaedit/projects";
import Link from "next/link";
import { useState } from "react";

export function SocialMediaCreator() {
  const [status, setStatus] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Social media creator</h2>
        <p className="mt-1 text-xs text-[var(--ge-muted)]">
          Pick a platform format, edit in GigaEdit, then publish to GigaSocial when you are ready.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {EXPORT_FORMATS.map((format) => (
          <button
            key={format.id}
            type="button"
            className="gigaedit-glass p-4 text-left"
            onClick={() =>
              void (async () => {
                const project = createEmptyProject({
                  kind: "social",
                  title: `${format.platform} draft`,
                  aspectRatio: format.aspectRatio,
                });
                await saveGigaEditProject(project);
                setStatus(`${format.label} project created (${format.aspectRatio}).`);
              })()
            }
          >
            <p className="text-sm font-semibold">{format.label}</p>
            <p className="mt-1 text-xs text-[var(--ge-muted)]">
              {format.platform} · {format.aspectRatio}
            </p>
          </button>
        ))}
      </div>
      <Link
        href="/gigasocial/"
        className="inline-flex rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs text-[var(--ge-gold)]"
      >
        Open GigaSocial to publish
      </Link>
      {status ? <p className="text-xs text-[var(--ge-gold)]">{status}</p> : null}
    </div>
  );
}
