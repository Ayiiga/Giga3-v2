/** Canonical learner-facing copy for already-enrolled enrol attempts. */
export const ALREADY_ENROLLED_MESSAGE = "You're already enrolled in this course.";

/** Map Convex / network enrol failures to short learner-facing copy. */
export function friendlyAcademyEnrolError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  if (/already enrolled/i.test(raw)) {
    return ALREADY_ENROLLED_MESSAGE;
  }
  if (/already completed/i.test(raw)) {
    return "You have already completed this course.";
  }
  if (/sign in|session/i.test(raw)) {
    return "Sign in required to enrol.";
  }
  if (/not found|not available/i.test(raw)) {
    return "This course is not available to enrol right now.";
  }
  if (/CONVEX|Request ID|Server Error|Uncaught Error/i.test(raw)) {
    return "Could not enrol right now. Please try again.";
  }
  if (raw.trim().length > 0 && raw.length < 140) return raw;
  return "Enrolment failed. Please try again.";
}
