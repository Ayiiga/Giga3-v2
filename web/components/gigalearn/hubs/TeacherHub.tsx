"use client";

import { GigaLearnToolPanel } from "@/components/gigalearn/GigaLearnToolPanel";
import { TeacherStudio } from "@/components/gigalearn/TeacherStudio";
import type { TeacherSubView } from "@/lib/gigalearn/sectionRouting";
import { TEACHER_TOOLS } from "@/lib/gigalearn/tools";
import { cn } from "@/lib/utils";
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
            className={cn(
              "min-h-10 rounded-full border px-4 py-1.5 text-xs font-medium",
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
        <TeacherStudio credits={credits} />
      ) : (
        <GigaLearnToolPanel tools={TEACHER_TOOLS} credits={credits} />
      )}
    </div>
  );
});
