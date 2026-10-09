"use client";

import { CreateHub } from "@/components/gigalearn/hubs/CreateHub";
import { InsightHub } from "@/components/gigalearn/hubs/InsightHub";
import { ParentHub } from "@/components/gigalearn/hubs/ParentHub";
import { StudentHub } from "@/components/gigalearn/hubs/StudentHub";
import { TeacherHub } from "@/components/gigalearn/hubs/TeacherHub";
import { TutorHub } from "@/components/gigalearn/hubs/TutorHub";
import { RecommendationEmptyState } from "@/components/recommendations/RecommendationEmptyState";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSignInPrompt } from "@/components/seo/ProductSignInPrompt";
import { ButtonLink } from "@/components/ui/Button";
import { useMediaBilling } from "@/hooks/useMediaBilling";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import {
  GIGALEARN_PRIMARY_AREAS,
  type GigaLearnPrimaryArea,
} from "@/lib/gigalearn/sections";
import {
  createSubViewFromTab,
  insightSubViewFromTab,
  resolvePrimaryArea,
  resolveStudentSubView,
  teacherSubViewFromTab,
  type StudentSubView,
} from "@/lib/gigalearn/sectionRouting";
import { hasPersistedAuth } from "@/lib/auth/sessionRestore";
import { getSessionToken } from "@/lib/auth";
import { saveGigaLearnProfile } from "@/lib/gigalearn/profile";
import { getStudioContext, saveStudioContext, type StudioContext } from "@/lib/gigalearn/studioContext";
import type { LearnerRole } from "@/lib/gigalearn/curricula";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { warmUpBrowserVoices } from "@/lib/speech/loadBrowserVoices";
import { ArrowLeft, GraduationCap } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function GigaLearnContent() {
  useRenderDiagnostic("GigaLearnContent");

  const params = useSearchParams();
  const tabParam = params.get("tab");
  const { email, usage, mounted } = useMediaBilling();

  const [area, setArea] = useState<GigaLearnPrimaryArea>(() => resolvePrimaryArea(tabParam));
  const [studentSubOverride, setStudentSubOverride] = useState<StudentSubView | undefined>();

  useEffect(() => {
    setArea(resolvePrimaryArea(params.get("tab")));
  }, [params]);

  useEffect(() => {
    warmUpBrowserVoices();
    const onFirstInteraction = () => {
      warmUpBrowserVoices();
      document.removeEventListener("pointerdown", onFirstInteraction);
    };
    document.addEventListener("pointerdown", onFirstInteraction, { passive: true });
    return () => document.removeEventListener("pointerdown", onFirstInteraction);
  }, []);

  function selectArea(next: GigaLearnPrimaryArea) {
    setArea(next);
    if (next !== "student") setStudentSubOverride(undefined);
    if (next === "student" || next === "teacher" || next === "parent") {
      saveGigaLearnProfile({ role: next as LearnerRole });
    }
  }

  function studyTopic(
    patch: Partial<StudioContext>,
    target: "learn" | "tutor" | "studio" | "revision" | "library"
  ) {
    if (Object.keys(patch).length > 0) saveStudioContext(patch);
    switch (target) {
      case "tutor":
        selectArea("tutor");
        break;
      case "studio":
        selectArea("teacher");
        break;
      case "revision":
        selectArea("student");
        setStudentSubOverride("revision");
        break;
      case "library":
        selectArea("student");
        setStudentSubOverride("library");
        break;
      case "learn":
      default:
        selectArea("student");
        setStudentSubOverride("learn");
        break;
    }
  }

  if (!mounted) {
    return <ClientAppHydrationNotice productName="GigaLearn" />;
  }

  if (!email && !hasPersistedAuth()) {
    return (
      <ProductSignInPrompt
        productName="GigaLearn"
        description="Sign in to use homework help, practice questions, and study plans with your Giga3 credits."
        nextPath="/gigalearn"
      />
    );
  }

  if (!email) {
    return <ClientAppHydrationNotice productName="GigaLearn" signInHref="/chat/login?next=/gigalearn" />;
  }

  const studentSub = resolveStudentSubView(tabParam, getStudioContext().levelId);
  const teacherSub = teacherSubViewFromTab(tabParam);
  const createSub = createSubViewFromTab(tabParam);
  const insightSub = insightSubViewFromTab(tabParam);

  return (
    <div className="gigalearn-stable mx-auto max-w-6xl space-y-6 pb-[calc(var(--primary-nav-offset,0px)+1rem)]">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={siteConfig.links.dashboard}
            className="mb-3 inline-flex min-h-9 items-center gap-2 text-sm text-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to chat
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <GraduationCap className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                GigaLearn
              </h2>
              <p className="text-sm text-muted">
                Student · Teacher · Create · Parent · Insight · AI Tutor
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-white px-3 py-2 text-right text-sm">
          <p className="text-xs text-muted">Credits</p>
          <p className="font-semibold text-foreground">{usage?.credits ?? "—"}</p>
          <Link href={siteConfig.links.credits} className="text-xs text-accent hover:underline">
            Get more
          </Link>
        </div>
      </header>

      <nav
        className="relative -mx-1"
        aria-label="GigaLearn areas"
      >
        <div
          className="gigalearn-grade-scroll flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 sm:grid sm:grid-cols-6 sm:overflow-visible sm:px-0"
          role="list"
        >
          {GIGALEARN_PRIMARY_AREAS.map((item) => {
            const Icon = item.icon;
            const active = area === item.id;
            const shortLabel = item.id === "tutor" ? "Tutor" : item.label;
            return (
              <button
                key={item.id}
                type="button"
                role="listitem"
                aria-current={active ? "page" : undefined}
                onClick={() => selectArea(item.id)}
                className={cn(
                  "flex min-h-11 min-w-[4.75rem] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border px-2.5 py-2 text-center text-xs font-medium sm:min-w-0 sm:text-sm",
                  active
                    ? "border-accent/40 bg-accent/10 text-foreground ring-1 ring-accent/20"
                    : "border-border bg-white text-muted hover:border-accent/25"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="sm:hidden">{shortLabel}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--background,#faf8ff)] to-transparent sm:hidden"
          aria-hidden
        />
      </nav>

      <section className="saas-card rounded-2xl border border-border p-4 sm:p-6">
        {area === "student" && (
          <StudentHub
            credits={usage?.credits ?? null}
            initialSubView={studentSubOverride ?? studentSub}
            onStudyTopic={studyTopic}
            onOpenTutor={() => selectArea("tutor")}
          />
        )}
        {area === "teacher" && (
          <TeacherHub credits={usage?.credits ?? null} initialSubView={teacherSub} />
        )}
        {area === "create" && (
          <CreateHub credits={usage?.credits ?? null} initialSubView={createSub} />
        )}
        {area === "parent" && <ParentHub credits={usage?.credits ?? null} />}
        {area === "insight" && (
          <InsightHub initialSubView={insightSub} onStudyTopic={studyTopic} />
        )}
        {area === "tutor" && <TutorHub credits={usage?.credits ?? null} />}
      </section>

      <RecommendationEmptyState
        surface="learn"
        sessionToken={getSessionToken()}
        title="Recommended for your learning path"
        description="Start with a tutor persona, GigaLearn practice, or a quick chat prompt."
      />

      <div className="flex flex-wrap gap-3">
        <ButtonLink href={siteConfig.links.dashboard} variant="outline" className="min-h-11">
          Open AI tutor chat
        </ButtonLink>
      </div>
    </div>
  );
}

function GigaLearnClientInner() {
  return (
    <Suspense fallback={<p className="text-center text-muted">Loading GigaLearn…</p>}>
      <GigaLearnContent />
    </Suspense>
  );
}

export function GigaLearnClient() {
  return (
    <ConvexAppShell>
      <GigaLearnClientInner />
    </ConvexAppShell>
  );
}
