"use client";

import { DiscoverHub } from "@/components/gigalearn/discover/DiscoverHub";
import { GigaLearnHomeworkPanel } from "@/components/gigalearn/GigaLearnHomeworkPanel";
import { GigaLearnToolPanel } from "@/components/gigalearn/GigaLearnToolPanel";
import { LowerGradesConcrete } from "@/components/gigalearn/LowerGradesConcrete";
import { ResourceLibrary } from "@/components/gigalearn/ResourceLibrary";
import { RevisionCenter } from "@/components/gigalearn/RevisionCenter";
import { StudentDashboard } from "@/components/gigalearn/StudentDashboard";
import { StudentMode } from "@/components/gigalearn/StudentMode";
import { StudioContextBar } from "@/components/gigalearn/StudioContextBar";
import type { StudentSubView } from "@/lib/gigalearn/sectionRouting";
import { STUDENT_TOOLS } from "@/lib/gigalearn/tools";
import { getStudioContext, saveStudioContext, type StudioContext } from "@/lib/gigalearn/studioContext";
import type { GigaLearnLevelId } from "@/lib/gigalearn/levels";
import { cn } from "@/lib/utils";
import { memo, useEffect, useState } from "react";

const SUB_VIEWS: Array<{ id: StudentSubView; label: string }> = [
  { id: "early-years", label: "Early years" },
  { id: "discover", label: "Discover" },
  { id: "learn", label: "Learn" },
  { id: "revision", label: "Revision" },
  { id: "library", label: "Library" },
  { id: "homework", label: "Homework" },
  { id: "home", label: "My path" },
];

interface StudentHubProps {
  credits: number | null;
  initialSubView?: StudentSubView;
  onStudyTopic: (
    patch: Partial<StudioContext>,
    tab: "learn" | "tutor" | "studio" | "revision" | "library"
  ) => void;
  onOpenTutor: () => void;
}

export const StudentHub = memo(function StudentHub({
  credits,
  initialSubView = "early-years",
  onStudyTopic,
  onOpenTutor,
}: StudentHubProps) {
  const [subView, setSubView] = useState<StudentSubView>(initialSubView);
  const [ctx, setCtx] = useState<StudioContext>(() => getStudioContext());

  useEffect(() => {
    setSubView(initialSubView);
  }, [initialSubView]);

  function updateCtx(patch: Partial<StudioContext>) {
    setCtx(saveStudioContext(patch));
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Student</h2>
        <p className="mt-1 text-sm text-muted">
          Your learning path, practice, revision and grade-appropriate activities.
        </p>
      </div>

      <StudioContextBar ctx={ctx} onChange={setCtx} idPrefix="gl-student" changeLabel="Learner context" />

      <nav className="relative -mx-1" aria-label="Student sections">
        <div className="gigalearn-grade-scroll flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1">
          {SUB_VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={subView === item.id ? "page" : undefined}
              onClick={() => setSubView(item.id)}
              className={cn(
                "min-h-11 shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold",
                subView === item.id
                  ? "border-accent/40 bg-accent/10 text-foreground"
                  : "border-border bg-white text-muted hover:border-accent/25"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--background,#faf8ff)] to-transparent"
          aria-hidden
        />
      </nav>

      {subView === "home" && (
        <>
          <StudentDashboard
            onNavigate={(tab) => {
              if (tab === "tutor") onOpenTutor();
              else if (tab === "learn") setSubView("learn");
              else if (tab === "revision") setSubView("revision");
              else if (tab === "library") setSubView("library");
            }}
            onStudyTopic={onStudyTopic}
          />
          <GigaLearnToolPanel tools={STUDENT_TOOLS} credits={credits} />
        </>
      )}

      {subView === "learn" && <StudentMode credits={credits} />}
      {subView === "revision" && (
        <RevisionCenter onStudyTopic={(patch, tab) => onStudyTopic(patch, tab)} />
      )}
      {subView === "library" && <ResourceLibrary />}
      {subView === "homework" && <GigaLearnHomeworkPanel />}
      {subView === "discover" && (
        <DiscoverHub
          preferredCountryId={ctx.countryId || "ghana"}
          preferredLevel={
            // Studio context stores curriculum ids (kg-2); Discover filters use Creche/KG chips.
            (() => {
              const map: Record<string, GigaLearnLevelId> = {
                creche: "Creche",
                "kg-1": "KG1",
                "kg-2": "KG2",
                "basic-1": "P1",
                "basic-2": "P2",
                "basic-3": "P3",
              };
              return map[ctx.levelId] ?? "KG2";
            })()
          }
        />
      )}
      {subView === "early-years" && (
        <LowerGradesConcrete credits={credits} ctx={ctx} onCtxChange={updateCtx} />
      )}
    </div>
  );
});
