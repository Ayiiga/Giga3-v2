"use client";

import { AdaptiveTutor } from "@/components/gigalearn/AdaptiveTutor";
import { memo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface TutorHubProps {
  credits: number | null;
}

export const TutorHub = memo(function TutorHub({ credits }: TutorHubProps) {
  const params = useSearchParams();
  const academyCourse = params.get("academyCourse") || params.get("course") || "";
  const academyModule = params.get("module") || "";
  const academyLesson = params.get("lesson") || "";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">AI Tutor</h2>
        <p className="mt-1 text-sm text-muted">
          Ask questions, get explanations, hints, practice and correction — using your curriculum
          context
          {academyCourse ? " and enrolled Academy lesson materials" : ""}.
        </p>
        {!academyCourse ? (
          <p className="mt-2 text-sm">
            <Link href="/gigalearn/academy/" className="font-semibold text-accent hover:underline">
              Browse Academy courses
            </Link>
            <span className="text-muted"> for structured, course-aware tutoring.</span>
          </p>
        ) : null}
      </div>
      <AdaptiveTutor
        credits={credits}
        academyCourseSlug={academyCourse || null}
        academyModuleId={academyModule || null}
        academyLessonId={academyLesson || null}
      />
    </div>
  );
});
