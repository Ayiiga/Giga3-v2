"use client";

import { AcademyChrome } from "@/components/gigalearn/academy/AcademyChrome";
import { LearningProgressRing } from "@/components/gigalearn/ui/LearningProgressRing";
import { ButtonLink } from "@/components/ui/Button";
import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSignInPrompt } from "@/components/seo/ProductSignInPrompt";
import { getSessionToken } from "@/lib/auth";
import { hasPersistedAuth } from "@/lib/auth/sessionRestore";
import { getBuiltinAcademyCourse } from "@/lib/gigalearn/academy/courseCatalog";
import { ACADEMY_SURFACE_CLASS } from "@/lib/gigalearn/academy/visualTheme";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";

export function AcademyMyCourses() {
  const sessionToken = getSessionToken();
  const enrolments = useQuery(
    api.gigaLearnAcademy.listMyEnrolments,
    sessionToken ? { sessionToken } : "skip"
  );

  if (!sessionToken && !hasPersistedAuth()) {
    return (
      <AcademyChrome active="my" title="My courses">
        <ProductSignInPrompt
          productName="GigaLearn Academy"
          description="Sign in to see server-verified Academy enrolments."
          nextPath="/gigalearn/academy/my/"
        />
      </AcademyChrome>
    );
  }

  return (
    <AcademyChrome
      active="my"
      title="My courses"
      subtitle="Academy enrolments are stored on the server. Enterprise classroom enrolments remain separate."
    >
      {enrolments === undefined ? (
        <ClientAppHydrationNotice productName="GigaLearn Academy" />
      ) : enrolments.length === 0 ? (
        <div className={cn(ACADEMY_SURFACE_CLASS.catalogue, "p-6")}>
          <p className="text-sm text-slate-600">You are not enrolled in any Academy courses yet.</p>
          <ButtonLink href="/gigalearn/academy/" className="mt-4 min-h-11">
            Browse catalogue
          </ButtonLink>
        </div>
      ) : (
        <ul className="space-y-3">
          {enrolments.map((row) => {
            const title =
              getBuiltinAcademyCourse(row.courseSlug)?.title ?? row.courseSlug;
            const percent =
              typeof row.progressPercent === "number" ? row.progressPercent : 0;
            return (
              <li key={`${row.courseSlug}-${row.enrolledAt}`}>
                <Link
                  href={`/gigalearn/academy/course/?slug=${encodeURIComponent(row.courseSlug)}`}
                  className="academy-visual-course-card hover:border-[#C4B5FD]"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <LearningProgressRing
                      percent={percent}
                      label={`${title} ${percent}% complete`}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-[#1E1B4B]">{title}</p>
                      <p className="text-xs text-slate-600">
                        Status: {row.status} · Pathway {percent}%
                        {row.lastLessonId ? ` · Resume @ ${row.lastLessonId}` : ""}
                      </p>
                      <div className="academy-visual-progress-track mt-2 w-full max-w-full">
                        <div
                          className="academy-visual-progress-fill"
                          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <span className="academy-visual-cta academy-visual-cta--success text-sm">
                    Continue →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AcademyChrome>
  );
}
