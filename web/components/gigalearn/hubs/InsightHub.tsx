"use client";

import { GigaLearnWorkspacePanel } from "@/components/gigalearn/GigaLearnWorkspacePanel";
import { TeacherInsights } from "@/components/gigalearn/TeacherInsights";
import type { InsightSubView } from "@/lib/gigalearn/sectionRouting";
import { getSessionToken } from "@/lib/auth";
import type { StudioContext } from "@/lib/gigalearn/studioContext";
import { memo, useState } from "react";

interface InsightHubProps {
  initialSubView?: InsightSubView;
  onStudyTopic: (
    patch: Partial<StudioContext>,
    tab: "learn" | "tutor" | "studio" | "revision" | "library"
  ) => void;
}

export const InsightHub = memo(function InsightHub({
  initialSubView = "progress",
  onStudyTopic,
}: InsightHubProps) {
  const [subView, setSubView] = useState<InsightSubView>(initialSubView);
  const sessionToken = getSessionToken();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Insight</h2>
        <p className="mt-1 text-sm text-muted">
          Real progress from your practice and tutor activity on this device — no fabricated stats.
        </p>
      </div>

      <nav className="flex gap-2" aria-label="Insight sections">
        {(
          [
            { id: "progress" as const, label: "My progress" },
            { id: "teacher" as const, label: "Classroom trends" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSubView(item.id)}
            aria-current={subView === item.id ? "page" : undefined}
            data-learn-tone="green"
            className="gigalearn-control px-3 py-2 text-xs"
          >
            {item.label}
          </button>
        ))}
      </nav>

      {subView === "progress" ? (
        <GigaLearnWorkspacePanel sessionToken={sessionToken} />
      ) : (
        <TeacherInsights onIntervene={(patch, tab) => onStudyTopic(patch, tab)} />
      )}
    </div>
  );
});
