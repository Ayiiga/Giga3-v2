"use client";

import {
  ACADEMY_CATEGORIES,
  ACADEMY_SUBJECTS,
  filterAcademyCourses,
  getBuiltinAcademyCourse,
  listBuiltinAcademyCourses,
  toAcademyListItem,
} from "@/lib/gigalearn/academy/courseCatalog";
import { getTechCourseMeta } from "@/lib/gigalearn/academy/techBanks/techBankMeta";
import type { AcademyCourseListItem } from "@/lib/gigalearn/academy/types";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { BookOpen, Clock3, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

function accessLabel(course: AcademyCourseListItem): string {
  if (course.access === "free") return "Free";
  if (course.access === "subscription") return "Subscription";
  return `Credits${course.creditCost != null ? ` · ${course.creditCost}+` : ""}`;
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Searchable course catalogue list — shared by Academy home and Catalogue page. */
export function AcademyCourseCatalogueBody() {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("all");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("all");

  const remoteCourses = useQuery(api.gigaLearnAcademy.listPublishedCourses, {
    query: query.trim() || undefined,
    subject: subject === "all" ? undefined : subject,
    category: category === "all" ? undefined : category,
    difficulty: difficulty === "all" ? undefined : difficulty,
  });

  const builtinCourses = useMemo(
    () =>
      filterAcademyCourses(listBuiltinAcademyCourses().map(toAcademyListItem), {
        query,
        subject,
        category,
        difficulty,
      }),
    [query, subject, category, difficulty]
  );
  const courses = remoteCourses ?? builtinCourses;

  const selectClass =
    "min-h-11 w-full rounded-xl border border-border bg-white px-3 text-sm text-foreground";

  const countLabel = useMemo(() => {
    return `${courses.length} course${courses.length === 1 ? "" : "s"}`;
  }, [courses]);

  return (
    <div className="space-y-4">
      <section className="saas-card space-y-4 rounded-2xl border border-border p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block sm:col-span-2 lg:col-span-4">
            <span className="mb-1 block text-xs font-medium text-muted">Search</span>
            <span className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search courses, subjects, exam prep…"
                className="min-h-11 w-full rounded-xl border border-border bg-white py-2 pl-10 pr-3 text-sm text-foreground"
              />
            </span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Subject</span>
            <select
              className={selectClass}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              <option value="all">All subjects</option>
              {ACADEMY_SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Category</span>
            <select
              className={selectClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">All categories</option>
              {ACADEMY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Difficulty</span>
            <select
              className={selectClass}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="all">All levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
        </div>
        <p className="text-xs text-muted" aria-live="polite">
          {countLabel}
        </p>
      </section>

      {courses.length === 0 ? (
        <p className="rounded-2xl border border-border bg-white p-6 text-sm text-muted">
          No courses match these filters. Try clearing search or choosing All subjects.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {courses.map((course: AcademyCourseListItem) => {
            const full = getBuiltinAcademyCourse(course.slug);
            const tech = getTechCourseMeta(course.slug);
            return (
            <li key={course.slug}>
              <Link
                href={`/gigalearn/academy/course/?slug=${encodeURIComponent(course.slug)}`}
                className="saas-card flex h-full flex-col rounded-2xl border border-border p-4 transition hover:border-accent/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-foreground">
                    {accessLabel(course)}
                  </span>
                  <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium capitalize text-muted">
                    {course.difficulty}
                  </span>
                  {course.certificateEligible ? (
                    <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted">
                      Certificate-eligible
                    </span>
                  ) : null}
                  {tech?.awaitingMaterials ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-900">
                      Awaiting bank
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 text-base font-semibold text-foreground">{course.title}</h3>
                <p className="mt-1 line-clamp-3 flex-1 text-sm text-muted">{course.description}</p>
                {full?.learningObjectives?.length ? (
                  <ul className="mt-2 line-clamp-2 list-inside list-disc text-xs text-muted">
                    {full.learningObjectives.slice(0, 2).map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" aria-hidden />
                    {course.subject} · {course.category}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden />
                    {formatDuration(course.durationMinutes)} · {course.moduleCount} modules
                    {tech
                      ? ` · ${tech.approvedQuestionCount} questions`
                      : ` · ${course.lessonCount} lessons`}
                  </span>
                </div>
                <span className="mt-3 text-sm font-semibold text-accent">
                  {tech ? "Start learning →" : "View course →"}
                </span>
              </Link>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
