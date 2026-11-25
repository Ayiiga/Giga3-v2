"use client";

import { AdaptiveTutor } from "@/components/gigalearn/AdaptiveTutor";
import { getSessionToken } from "@/lib/auth";
import { LEARNING_WORLDS } from "@/lib/gigalearn/learningWorlds";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
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
  const sessionToken = getSessionToken();
  const access = useQuery(api.childSafety.getAgeAccess, sessionToken ? { sessionToken } : "skip");

  if (sessionToken && access === undefined) {
    return <p role="status">Checking tutor access…</p>;
  }

  if (access?.category !== "adult") {
    return (
      <section className="space-y-3" aria-labelledby="guided-tutor-title">
        <h2 id="guided-tutor-title" className="text-lg font-semibold">Guided learning help</h2>
        <p>Choose your learning world for hints, explanations and examples.</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {LEARNING_WORLDS.map((world) => (
            <li key={world.id}>
              <Link className="gigalearn-control w-full px-3 py-2" href={`/gigalearn/?world=${world.id}`}>
                {world.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  }

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
