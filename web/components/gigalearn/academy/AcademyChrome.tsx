"use client";

import { ACADEMY_SURFACE_CLASS } from "@/lib/gigalearn/academy/visualTheme";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site";
import { ArrowLeft, GraduationCap } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Academy Phase 1 nav + Exam Practice Centre entry (PR #548 + #549 integration).
 * Exam Practice uses its own page chrome for section highlighting.
 */
const NAV = [
  { href: "/gigalearn/academy/", label: "Home", key: "home" as const },
  { href: "/gigalearn/?tab=early-years", label: "Early years", key: null },
  { href: "/gigalearn/?tab=learn", label: "Basic school", key: null },
  { href: "/gigalearn/academy/courses/", label: "Courses", key: "catalogue" as const },
  { href: "/gigalearn/exam/", label: "Exam Practice", key: null },
  { href: "/gigalearn/academy/assess/", label: "Practice", key: "practice" as const },
  { href: "/gigalearn/academy/my/", label: "My courses", key: "my" as const },
  { href: "/gigalearn/academy/certificates/", label: "Certificates", key: "certificates" as const },
  { href: "/gigalearn/academy/verify/", label: "Verify", key: "verify" as const },
  { href: "/gigalearn/academy/author/", label: "Author", key: "author" as const },
  { href: "/gigalearn/", label: "GigaLearn hubs", key: null },
] as const;

export type AcademyNavActive =
  | "home"
  | "catalogue"
  | "practice"
  | "my"
  | "author"
  | "course"
  | "certificates"
  | "verify";

export function AcademyChrome({
  children,
  title,
  subtitle,
  active,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  active?: AcademyNavActive;
}) {
  return (
    <div
      className={cn(
        ACADEMY_SURFACE_CLASS.shell,
        "gigalearn-stable document-compact mx-auto w-full min-w-0 max-w-6xl pb-[calc(var(--primary-nav-offset,0px)+1rem)]"
      )}
    >
      <div className="academy-visual-panel min-w-0 space-y-4 p-3 sm:p-6">
        <header className="space-y-3">
          <Link
            href={siteConfig.links.gigalearn}
            className="inline-flex min-h-9 items-center gap-2 text-sm text-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to GigaLearn
          </Link>
          <div className="flex flex-wrap items-start gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] text-white shadow-md"
              aria-hidden
            >
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6D28D9]">
                GigaLearn Academy
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-[#1E1B4B] sm:text-3xl">
                {title}
              </h2>
              {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
            </div>
          </div>
          <nav aria-label="Academy sections" className="relative -mx-1">
            <div className="academy-visual-nav gigalearn-grade-scroll px-1">
              {NAV.map((item) => {
                const isActive =
                  item.key != null &&
                  (active === item.key || (active === "course" && item.key === "catalogue"));
                return (
                  <Link
                    key={`${item.href}:${item.label}`}
                    href={item.href}
                    className={cn(
                      "academy-visual-nav-link",
                      isActive && "academy-visual-nav-link--active"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </header>
        <div className="min-w-0 space-y-4">{children}</div>
      </div>
    </div>
  );
}
