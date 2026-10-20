/**
 * Client-safe Technology Learning Hub metadata (no answer keys).
 * Full banks are loaded only on the Convex server via techBankServer.
 * Exam Practice banks are adapted into the same practice surface.
 */
import type { TechCourseMeta } from "@/lib/gigalearn/academy/techBanks/techBankTypes";
import metaJson from "@/lib/gigalearn/academy/techBanks/meta.json";
import {
  examBankAsTechCourseMeta,
  getExamBankMeta,
  listExamBankMeta,
} from "@/lib/gigalearn/examPractice/examBankMeta";

const COURSES = metaJson.courses as TechCourseMeta[];

export const TECH_HUB_COURSE_SLUGS = COURSES.map((c) => c.courseSlug);

export function listTechCourseMeta(): TechCourseMeta[] {
  return COURSES;
}

export function getTechCourseMeta(courseSlug: string): TechCourseMeta | undefined {
  const slug = courseSlug.trim().toLowerCase();
  const tech = COURSES.find((c) => c.courseSlug === slug);
  if (tech) return tech;
  const exam = getExamBankMeta(slug);
  return exam ? examBankAsTechCourseMeta(exam) : undefined;
}

export function isTechHubCourse(courseSlug: string): boolean {
  return Boolean(getTechCourseMeta(courseSlug));
}

export function listPracticeCourseMeta(): TechCourseMeta[] {
  return [
    ...COURSES,
    ...listExamBankMeta().map(examBankAsTechCourseMeta),
  ];
}

export function techPracticeHref(
  courseSlug: string,
  opts?: { mode?: string; topic?: string; count?: number }
): string {
  const params = new URLSearchParams();
  params.set("course", courseSlug);
  if (opts?.mode) params.set("mode", opts.mode);
  if (opts?.topic) params.set("topic", opts.topic);
  if (opts?.count != null && Number.isFinite(opts.count) && opts.count > 0) {
    params.set("count", String(Math.floor(opts.count)));
  }
  return `/gigalearn/academy/tech/?${params.toString()}`;
}
