/**
 * GigaLearn Academy Phase 4 — course completion / certificate eligibility policies.
 * Evaluated only from server-held enrolment + assessment data (never client completion flags).
 */
import { getBuiltinAcademyCourse } from "@/lib/gigalearn/academy/courseCatalog";
import { listBuiltinAssessmentsForCourse } from "@/lib/gigalearn/academy/assessmentCatalog";

export const CERTIFICATE_ISSUER = "Giga3 AI — GigaLearn Academy";
export const CERTIFICATE_TEMPLATE_VERSION = "academy-cert-v1";
export const CERTIFICATE_VERIFY_PATH = "/gigalearn/academy/verify/";

export type CertificateRequirementKind =
  | "course_certificate_eligible"
  | "enrolment_active"
  | "required_lessons"
  | "required_modules"
  | "required_assessments"
  | "minimum_final_score"
  | "instructor_approval"
  | "required_project_approved";

export type CertificatePolicy = {
  courseSlug: string;
  /** Course must be marked certificateEligible in catalogue/authored row. */
  requireCertificateEligible: boolean;
  requiredLessonIds: string[];
  requiredModuleIds: string[];
  requiredAssessmentIds: string[];
  /** Assessment id whose best passing score must meet minimumFinalScore. */
  finalAssessmentId?: string;
  minimumFinalScore?: number;
  requireInstructorApproval: boolean;
  requireProjectApproved: boolean;
};

/** Built-in policies — only courses listed here may auto-issue certificates. */
const BUILTIN_POLICIES: CertificatePolicy[] = [
  {
    courseSlug: "bece-maths-foundations",
    requireCertificateEligible: true,
    requiredLessonIds: [
      "l1-overview",
      "l1-practice",
      "l2-practice",
      "l3-revision",
    ],
    requiredModuleIds: ["m1-numbers", "m2-algebra", "m3-revision"],
    requiredAssessmentIds: [
      "bece-maths-m1-quiz",
      "bece-maths-m2-quiz",
      "bece-maths-final",
    ],
    finalAssessmentId: "bece-maths-final",
    minimumFinalScore: 75,
    requireInstructorApproval: false,
    requireProjectApproved: false,
  },
  {
    courseSlug: "wassce-english-writing",
    requireCertificateEligible: true,
    requiredLessonIds: ["l1-plan", "l1-practice", "l2-exam"],
    requiredModuleIds: ["m1-essay", "m2-exam"],
    requiredAssessmentIds: ["wassce-english-m1-quiz"],
    finalAssessmentId: "wassce-english-m1-quiz",
    minimumFinalScore: 70,
    requireInstructorApproval: false,
    requireProjectApproved: false,
  },
  {
    courseSlug: "teacher-lesson-studio-basics",
    requireCertificateEligible: true,
    requiredLessonIds: ["l1-teacher", "l1-quiz"],
    requiredModuleIds: ["m1-lesson"],
    requiredAssessmentIds: ["teacher-studio-review"],
    requireInstructorApproval: true,
    requireProjectApproved: false,
  },
];

export function getCertificatePolicy(courseSlug: string): CertificatePolicy | null {
  const slug = courseSlug.trim().toLowerCase();
  return BUILTIN_POLICIES.find((p) => p.courseSlug === slug) ?? null;
}

export function listCertificatePolicies(): CertificatePolicy[] {
  return [...BUILTIN_POLICIES];
}

export type EligibilityInput = {
  courseSlug: string;
  /** From course catalogue / authored row — server-resolved. */
  certificateEligible: boolean;
  enrolmentStatus: "active" | "withdrawn" | "completed" | null;
  completedLessonIds: string[];
  completedModuleIds: string[];
  /** assessmentId → best passing score (0–100). */
  passedAssessmentScores: Record<string, number>;
  instructorApproved: boolean;
  projectApproved: boolean;
};

export type EligibilityResult = {
  eligible: boolean;
  courseSlug: string;
  policyFound: boolean;
  missing: Array<{ kind: CertificateRequirementKind; detail: string }>;
  finalScore: number | null;
  requiredAssessmentIds: string[];
};

export function evaluateCertificateEligibility(input: EligibilityInput): EligibilityResult {
  const slug = input.courseSlug.trim().toLowerCase();
  const policy = getCertificatePolicy(slug);
  if (!policy) {
    return {
      eligible: false,
      courseSlug: slug,
      policyFound: false,
      missing: [
        {
          kind: "course_certificate_eligible",
          detail: "No certificate completion policy is configured for this course.",
        },
      ],
      finalScore: null,
      requiredAssessmentIds: [],
    };
  }

  const missing: EligibilityResult["missing"] = [];

  if (policy.requireCertificateEligible && !input.certificateEligible) {
    missing.push({
      kind: "course_certificate_eligible",
      detail: "This course is not marked certificate-eligible.",
    });
  }

  if (!input.enrolmentStatus || input.enrolmentStatus === "withdrawn") {
    missing.push({
      kind: "enrolment_active",
      detail: "Active or completed Academy enrolment is required.",
    });
  }

  const completedLessons = new Set(input.completedLessonIds);
  for (const id of policy.requiredLessonIds) {
    if (!completedLessons.has(id)) {
      missing.push({
        kind: "required_lessons",
        detail: `Required lesson not completed: ${id}`,
      });
    }
  }

  const completedModules = new Set(input.completedModuleIds);
  for (const id of policy.requiredModuleIds) {
    if (!completedModules.has(id)) {
      missing.push({
        kind: "required_modules",
        detail: `Required module not completed: ${id}`,
      });
    }
  }

  for (const id of policy.requiredAssessmentIds) {
    if (input.passedAssessmentScores[id] == null) {
      missing.push({
        kind: "required_assessments",
        detail: `Required assessment not passed: ${id}`,
      });
    }
  }

  let finalScore: number | null = null;
  if (policy.finalAssessmentId) {
    finalScore = input.passedAssessmentScores[policy.finalAssessmentId] ?? null;
    if (
      policy.minimumFinalScore != null &&
      (finalScore == null || finalScore < policy.minimumFinalScore)
    ) {
      missing.push({
        kind: "minimum_final_score",
        detail: `Final score must be at least ${policy.minimumFinalScore}% (assessment ${policy.finalAssessmentId}).`,
      });
    }
  }

  if (policy.requireInstructorApproval && !input.instructorApproved) {
    missing.push({
      kind: "instructor_approval",
      detail: "Instructor approval is required before a certificate can be issued.",
    });
  }

  if (policy.requireProjectApproved && !input.projectApproved) {
    missing.push({
      kind: "required_project_approved",
      detail: "An approved course project is required.",
    });
  }

  return {
    eligible: missing.length === 0,
    courseSlug: slug,
    policyFound: true,
    missing,
    finalScore,
    requiredAssessmentIds: [...policy.requiredAssessmentIds],
  };
}

/** Derive module completion from completed lesson ids + course definition. */
export function modulesCompletedFromLessons(
  courseSlug: string,
  completedLessonIds: string[]
): string[] {
  const course = getBuiltinAcademyCourse(courseSlug);
  if (!course) return [];
  const done = new Set(completedLessonIds);
  return course.modules
    .filter((m) => {
      const required = m.lessons.filter((l) => l.required);
      const check = required.length > 0 ? required : m.lessons;
      return check.length > 0 && check.every((l) => done.has(l.id));
    })
    .map((m) => m.id);
}

export function publicDisplayName(fullName: string | undefined | null, fallbackLabel = "Learner"): string {
  const raw = (fullName ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return fallbackLabel;
  const parts = raw.split(" ");
  if (parts.length === 1) return parts[0]!.slice(0, 40);
  const first = parts[0]!.slice(0, 30);
  const lastInitial = parts[parts.length - 1]!.charAt(0).toUpperCase();
  return `${first} ${lastInitial}.`;
}

export function buildVerificationUrl(publicId: string, origin = "https://www.giga3ai.com"): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${CERTIFICATE_VERIFY_PATH}?c=${encodeURIComponent(publicId)}`;
}

/** Sanity: policies reference real assessments when assessments exist for the course. */
export function policyAssessmentIdsExist(courseSlug: string): boolean {
  const policy = getCertificatePolicy(courseSlug);
  if (!policy) return false;
  const defs = new Set(listBuiltinAssessmentsForCourse(courseSlug).map((a) => a.id));
  return policy.requiredAssessmentIds.every((id) => defs.has(id));
}
