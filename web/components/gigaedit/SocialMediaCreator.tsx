"use client";

import { EXPORT_FORMATS } from "@/lib/gigaedit/types";
import { createEmptyProject, saveGigaEditProject } from "@/lib/gigaedit/projects";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SocialMediaCreator() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Social media creator</h2>
        <p className="mt-1 text-xs text-[var(--ge-muted)]">
          Pick a platform format — opens the editor with that aspect ratio, then Post to GigaSocial
          for Feed, Reel, Story, Draft, Device, or External.
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
                const isVertical =
                  format.aspectRatio === "9:16" || format.aspectRatio === "4:5";
                const project = createEmptyProject({
                  kind: isVertical ? "video" : "photo",
                  title: `${format.platform} draft`,
                  aspectRatio: format.aspectRatio,
                });
                await saveGigaEditProject(project);
                setStatus(`${format.label} project created (${format.aspectRatio}).`);
                const tab = isVertical ? "video" : "photo";
                router.push(
                  `/gigaedit/?tab=${tab}&project=${encodeURIComponent(project.id)}&aspect=${encodeURIComponent(format.aspectRatio)}`
                );
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
      <div className="flex flex-wrap gap-2">
        <Link
          href="/gigaedit/?tab=video&aspect=9%3A16"
          className="inline-flex rounded-xl bg-[var(--ge-gold)] px-3 py-2 text-xs font-bold text-[#0b1220]"
        >
          Open video editor
        </Link>
        <Link
          href="/gigasocial/?tab=feed"
          className="inline-flex rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs text-[var(--ge-gold)]"
        >
          Open GigaSocial
        </Link>
      </div>
      {status ? <p className="text-xs text-[var(--ge-gold)]">{status}</p> : null}
    </div>
  );
}
