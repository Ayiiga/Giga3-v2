/**
 * GigaLearn Academy — Phase 1 shared types.
 * Separate from Marketplace Creator Academy and from enterprise org enrolments.
 */

export type AcademyDifficulty = "beginner" | "intermediate" | "advanced";

export type AcademyAccess = "free" | "credits" | "subscription";

export type AcademyCourseStatus = "draft" | "published" | "archived";

/** Reference into existing GigaLearn surfaces — not a content copy. */
export type AcademyResourceRef =
  | { kind: "gigalearn_tool"; toolId: string; label: string }
  | { kind: "gigalearn_tab"; tab: string; label: string }
  | { kind: "curriculum_subject"; subjectId: string; levelId?: string; label: string }
  | { kind: "media_item"; mediaId: string; label: string }
  | { kind: "external"; href: string; label: string };

export type AcademyActivityKind =
  | "lesson"
  | "practice"
  | "quiz"
  | "resource"
  | "tutor"
  | "revision";

export interface AcademyLesson {
  id: string;
  title: string;
  summary: string;
  required: boolean;
  estimatedMinutes: number;
  activityKind: AcademyActivityKind;
  /** Links into existing GigaLearn tools/content rather than duplicating bodies. */
  resource?: AcademyResourceRef;
}

export interface AcademyModule {
  id: string;
  title: string;
  summary: string;
  lessons: AcademyLesson[];
}

export interface AcademyCourse {
  slug: string;
  title: string;
  description: string;
  subject: string;
  category: string;
  difficulty: AcademyDifficulty;
  durationMinutes: number;
  learningObjectives: string[];
  prerequisites: string[];
  curriculumPreview: string;
  assessmentDescription: string;
  instructorName?: string;
  instructorBio?: string;
  access: AcademyAccess;
  creditCost?: number;
  certificateEligible: boolean;
  completionRequirements: string;
  modules: AcademyModule[];
  /** Built-in catalogue vs author-created Convex row. */
  source: "catalog" | "authored";
  status: AcademyCourseStatus;
}

export interface AcademyCourseListItem {
  slug: string;
  title: string;
  description: string;
  subject: string;
  category: string;
  difficulty: AcademyDifficulty;
  durationMinutes: number;
  access: AcademyAccess;
  creditCost?: number;
  certificateEligible: boolean;
  instructorName?: string;
  moduleCount: number;
  lessonCount: number;
  source: "catalog" | "authored";
}

export interface AcademyEnrolmentSummary {
  courseSlug: string;
  status: "active" | "withdrawn" | "completed";
  enrolledAt: number;
  lastModuleId?: string;
  lastLessonId?: string;
  progressPercent: number;
  updatedAt: number;
}
