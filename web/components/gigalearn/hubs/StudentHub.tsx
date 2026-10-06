"use client";

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
import { getLevel, resolveLegacyLevelId } from "@/lib/gigalearn/curriculumEngine";
import { getStudioContext, saveStudioContext, type StudioContext } from "@/lib/gigalearn/studioContext";
import { cn } from "@/lib/utils";
import { memo, useState } from "react";

const SUB_VIEWS: Array<{ id: StudentSubView; label: string }> = [
  { id: "home", label: "My path" },
  { id: "learn", label: "Learn" },
  { id: "revision", label: "Revision" },
  { id: "library", label: "Library" },
  { id: "homework", label: "Homework" },
  { id: "early-years", label: "Early years" },
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
  initialSubView = "home",
  onStudyTopic,
  onOpenTutor,
}: StudentHubProps) {
  const [subView, setSubView] = useState<StudentSubView>(initialSubView);
  const [ctx, setCtx] = useState<StudioContext>(() => getStudioContext());
  const levelBand = getLevel(resolveLegacyLevelId(ctx.levelId))?.band;
  const showEarlyYears = levelBand === "early-years" || levelBand === "primary";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Student</h2>
        <p className="mt-1 text-sm text-muted">
          Your learning path, practice, revision and grade-appropriate activities.
        </p>
      </div>

      <StudioContextBar ctx={ctx} onChange={setCtx} idPrefix="gl-student" changeLabel="Learner context" />

      <nav
        className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1"
        aria-label="Student sections"
      >
        {SUB_VIEWS.filter((v) => v.id !== "early-years" || showEarlyYears).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSubView(item.id)}
            className={cn(
              "min-h-10 shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
              subView === item.id
                ? "border-accent/40 bg-accent/10 text-foreground"
                : "border-border bg-white text-muted hover:border-accent/25"
            )}
          >
            {item.label}
          </button>
        ))}
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
      {subView === "early-years" && showEarlyYears && <LowerGradesConcrete />}
    </div>
  );
});
