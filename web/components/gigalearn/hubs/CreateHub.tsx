"use client";

import type { CreateSubView } from "@/lib/gigalearn/sectionRouting";
import { buildCreationLink } from "@/lib/gigalearn/creation/links";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { memo, useState } from "react";

const panelFallback = <p className="text-sm text-muted">Loading…</p>;

const CreationStudio = dynamic(
  () => import("@/components/gigalearn/creation/CreationStudio").then((m) => m.CreationStudio),
  { ssr: false, loading: () => panelFallback }
);

const GigaRhymesPanel = dynamic(
  () => import("@/components/gigalearn/rhymes/GigaRhymesPanel").then((m) => m.GigaRhymesPanel),
  { ssr: false, loading: () => panelFallback }
);

interface CreateHubProps {
  credits: number | null;
  initialSubView?: CreateSubView;
}

export const CreateHub = memo(function CreateHub({ credits, initialSubView = "studio" }: CreateHubProps) {
  const router = useRouter();
  const [subView, setSubView] = useState<CreateSubView>(initialSubView);

  return (
    <div className="document-compact space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Create</h2>
        <p className="mt-1 text-sm text-muted">
          Lessons, quizzes, worksheets, CVs, stories and rhymes — plus Document Studio for PDF/Word.
        </p>
        <a
          href="/documents/"
          className="mt-2 inline-flex min-h-11 items-center rounded-full border border-accent/30 bg-accent/10 px-4 text-xs font-semibold text-foreground"
        >
          Open Document Studio
        </a>
      </div>

      <nav className="flex gap-2" aria-label="Create sections">
        {(
          [
            { id: "studio" as const, label: "Creation studio" },
            { id: "rhymes" as const, label: "GigaRhymes" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSubView(item.id)}
            className={cn(
              "min-h-11 rounded-full border px-4 py-1.5 text-xs font-medium",
              subView === item.id
                ? "border-accent/40 bg-accent/10 text-foreground"
                : "border-border bg-white text-muted"
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {subView === "studio" ? (
        <CreationStudio credits={credits} onOpenRhymes={() => setSubView("rhymes")} />
      ) : (
        <GigaRhymesPanel onCreateRhyme={() => router.push(buildCreationLink("rhyme"))} />
      )}
    </div>
  );
});
