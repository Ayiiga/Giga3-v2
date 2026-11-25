"use client";

import { GigaLearnToolPanel } from "@/components/gigalearn/GigaLearnToolPanel";
import { TeacherStudio } from "@/components/gigalearn/TeacherStudio";
import { WorldActivityGuides } from "@/components/gigalearn/WorldActivityGuides";
import type { TeacherSubView } from "@/lib/gigalearn/sectionRouting";
import { TEACHER_TOOLS } from "@/lib/gigalearn/tools";
import { memo, useState } from "react";

interface TeacherHubProps {
  credits: number | null;
  initialSubView?: TeacherSubView;
}

export const TeacherHub = memo(function TeacherHub({
  credits,
  initialSubView = "studio",
}: TeacherHubProps) {
  const [subView, setSubView] = useState<TeacherSubView>(initialSubView);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Teacher</h2>
        <p className="mt-1 text-sm text-muted">
          Curriculum-aligned lesson planning, resources, assessments and classroom activities.
        </p>
      </div>

      <nav className="flex gap-2" aria-label="Teacher sections">
        {(
          [
            { id: "studio" as const, label: "Teacher Studio" },
            { id: "tools" as const, label: "Quick tools" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSubView(item.id)}
            aria-current={subView === item.id ? "page" : undefined}
            data-learn-tone="blue"
            className="gigalearn-control px-3 py-2 text-xs"
          >
            {item.label}
          </button>
        ))}
      </nav>

      {subView === "studio" ? (
        <TeacherStudio credits={credits} />
      ) : (
        <>
          <WorldActivityGuides />
          <GigaLearnToolPanel tools={TEACHER_TOOLS} credits={credits} />
        </>
      )}
    </div>
  );
});
