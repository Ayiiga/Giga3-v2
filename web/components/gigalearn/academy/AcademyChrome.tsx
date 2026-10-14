"use client";

import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site";
import { ArrowLeft, GraduationCap } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const NAV = [
  { href: "/gigalearn/academy/", label: "Catalogue" },
  { href: "/gigalearn/academy/my/", label: "My courses" },
  { href: "/gigalearn/academy/author/", label: "Author" },
  { href: "/gigalearn/", label: "GigaLearn hubs" },
] as const;

export function AcademyChrome({
  children,
  title,
  subtitle,
  active,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  active?: "catalogue" | "my" | "author" | "course";
}) {
  return (
    <div className="gigalearn-stable document-compact mx-auto max-w-6xl space-y-4 pb-[calc(var(--primary-nav-offset,0px)+1rem)]">
      <header className="space-y-3">
        <Link
          href={siteConfig.links.gigalearn}
          className="inline-flex min-h-9 items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to GigaLearn
        </Link>
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <GraduationCap className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              GigaLearn Academy
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h2>
            {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
          </div>
        </div>
        <nav aria-label="Academy sections" className="relative -mx-1">
          <div className="gigalearn-grade-scroll flex gap-2 overflow-x-auto px-1 pb-1">
            {NAV.map((item) => {
              const key =
                item.label === "Catalogue"
                  ? "catalogue"
                  : item.label === "My courses"
                    ? "my"
                    : item.label === "Author"
                      ? "author"
                      : null;
              const isActive =
                (active === "catalogue" && key === "catalogue") ||
                (active === "my" && key === "my") ||
                (active === "author" && key === "author") ||
                (active === "course" && key === "catalogue");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "min-h-11 shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold",
                    isActive
                      ? "border-accent/40 bg-accent/10 text-foreground"
                      : "border-border bg-white text-muted hover:border-accent/25"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
      {children}
    </div>
  );
}
