"use client";

import { AcademyChrome } from "@/components/gigalearn/academy/AcademyChrome";
import { ButtonLink } from "@/components/ui/Button";
import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSignInPrompt } from "@/components/seo/ProductSignInPrompt";
import { getSessionToken } from "@/lib/auth";
import { hasPersistedAuth } from "@/lib/auth/sessionRestore";
import { getBuiltinAcademyCourse } from "@/lib/gigalearn/academy/courseCatalog";
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
        <div className="saas-card rounded-2xl border border-border p-6">
          <p className="text-sm text-muted">You are not enrolled in any Academy courses yet.</p>
          <ButtonLink href="/gigalearn/academy/" className="mt-4 min-h-11">
            Browse catalogue
          </ButtonLink>
        </div>
      ) : (
        <ul className="space-y-3">
          {enrolments.map((row) => {
            const title =
              getBuiltinAcademyCourse(row.courseSlug)?.title ?? row.courseSlug;
            return (
              <li key={`${row.courseSlug}-${row.enrolledAt}`}>
                <Link
                  href={`/gigalearn/academy/course/?slug=${encodeURIComponent(row.courseSlug)}`}
                  className="saas-card flex flex-col gap-2 rounded-2xl border border-border p-4 hover:border-accent/35 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-foreground">{title}</p>
                    <p className="text-xs text-muted">
                      Status: {row.status} · Pathway {row.progressPercent}%
                      {row.lastLessonId ? ` · Resume @ ${row.lastLessonId}` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-accent">Continue →</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AcademyChrome>
  );
}
