"use client";

import { GigaLearnHomeworkPanel } from "@/components/gigalearn/GigaLearnHomeworkPanel";
import { GigaLearnToolPanel } from "@/components/gigalearn/GigaLearnToolPanel";
import { GigaLearnWorkspacePanel } from "@/components/gigalearn/GigaLearnWorkspacePanel";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useMediaBilling } from "@/hooks/useMediaBilling";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import {
  GIGALEARN_SECTIONS,
  type GigaLearnSection,
} from "@/lib/gigalearn/sections";
import {
  PARENT_TOOLS,
  STUDENT_TOOLS,
  TEACHER_TOOLS,
} from "@/lib/gigalearn/tools";
import { getGigaLearnProfile, saveGigaLearnProfile } from "@/lib/gigalearn/profile";
import type { LearnerRole } from "@/lib/gigalearn/curricula";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { ArrowLeft, GraduationCap } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function GigaLearnContent() {
  useRenderDiagnostic("GigaLearnContent");

  const router = useRouter();
  const params = useSearchParams();
  const { email, usage, mounted } = useMediaBilling();
  const initialTab = (params.get("tab") as GigaLearnSection) || "student";
  const [section, setSection] = useState<GigaLearnSection>(
    GIGALEARN_SECTIONS.some((s) => s.id === initialTab) ? initialTab : "student"
  );
  const [role, setRole] = useState<LearnerRole>("student");

  useEffect(() => {
    if (!email) router.replace("/chat/login?next=/gigalearn");
  }, [email, router]);

  useEffect(() => {
    const tab = params.get("tab") as GigaLearnSection;
    if (tab && GIGALEARN_SECTIONS.some((s) => s.id === tab)) {
      setSection(tab);
    }
  }, [params]);

  useEffect(() => {
    const profile = getGigaLearnProfile();
    setRole(profile.role);
    if (profile.role !== "parent" && section === "parent") {
      /* keep explicit tab selection */
    }
  }, [section]);

  function selectRole(next: LearnerRole) {
    setRole(next);
    saveGigaLearnProfile({ role: next });
    if (next === "student") setSection("student");
    if (next === "teacher") setSection("teacher");
    if (next === "parent") setSection("parent");
  }

  if (!email) {
    return <p className="text-center text-base text-muted">Redirecting…</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
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
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                GigaLearn
              </h1>
              <p className="text-sm text-muted">
                AI tutor for students, teachers, and parents — BECE, WASSCE, WAEC, and beyond.
              </p>
            </div>
          </div>
        </div>
        <div className="saas-card rounded-2xl border border-border px-4 py-3 text-right">
          <p className="text-xs text-muted">Credits</p>
          <p className="text-xl font-semibold text-foreground">{usage?.credits ?? "—"}</p>
          <Link href={siteConfig.links.credits} className="text-xs text-accent hover:underline">
            Get more
          </Link>
        </div>
      </header>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Learner role">
        {(["student", "teacher", "parent"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => selectRole(r)}
            className={cn(
              "min-h-9 rounded-full border px-4 py-1.5 text-xs font-medium capitalize",
              role === r
                ? "border-accent/40 bg-accent/10 text-foreground"
                : "border-border text-muted hover:border-accent/25"
            )}
          >
            {r}
          </button>
        ))}
      </div>

      <nav
        className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1"
        aria-label="GigaLearn sections"
      >
        {GIGALEARN_SECTIONS.map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium",
                active
                  ? "border-accent/40 bg-accent/10 text-foreground ring-1 ring-accent/20"
                  : "border-border bg-white text-muted hover:border-accent/25"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
            </button>
          );
        })}
      </nav>

      <section className="saas-card rounded-2xl border border-border p-4 sm:p-6">
        {section === "student" && (
          <>
            <SectionIntro
              title="Student dashboard"
              description="Personalized quizzes, study plans, topic explainers, and exam prep for BECE, WASSCE, and WAEC."
            />
            <GigaLearnToolPanel tools={STUDENT_TOOLS} credits={usage?.credits ?? null} />
          </>
        )}

        {section === "teacher" && (
          <>
            <SectionIntro
              title="Teacher dashboard"
              description="Lesson notes, worksheets, assignments, and class activities aligned to your curriculum."
            />
            <GigaLearnToolPanel tools={TEACHER_TOOLS} credits={usage?.credits ?? null} />
          </>
        )}

        {section === "parent" && (
          <>
            <SectionIntro
              title="Parent dashboard"
              description="Understand what your child is learning and how to support them at home."
            />
            <GigaLearnToolPanel tools={PARENT_TOOLS} credits={usage?.credits ?? null} />
          </>
        )}

        {section === "homework" && (
          <>
            <SectionIntro
              title="Homework solver"
              description="Upload a photo of homework — Giga3 analyzes it with vision AI in Education chat mode."
            />
            <GigaLearnHomeworkPanel />
          </>
        )}

        {section === "workspace" && (
          <>
            <SectionIntro
              title="Learning progress"
              description="Track achievements, subjects studied, and saved learning materials."
            />
            <GigaLearnWorkspacePanel />
          </>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href={siteConfig.links.dashboard} variant="outline" className="min-h-11">
          Open AI tutor chat
        </ButtonLink>
        <ButtonLink href={siteConfig.links.creatorStudio} variant="outline" className="min-h-11">
          Creator Studio
        </ButtonLink>
      </div>
    </div>
  );
}

function SectionIntro({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
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
