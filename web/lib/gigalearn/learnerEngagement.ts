/**
 * Client helpers for GigaLearn learner engagement signals.
 * Fire-and-forget; never blocks learning flows.
 */

export type LearnerEngagementClientEvent =
  | "exam_centre_open"
  | "academy_home_open"
  | "assess_hub_open"
  | "resume_course_click"
  | "teacher_hub_from_exam"
  | "student_learn_from_exam";

const fired = new Set<string>();

/** Record once per page session key (avoids double-fire from Strict Mode remounts within same key). */
export function learnerEventSessionKey(event: LearnerEngagementClientEvent, detail = ""): string {
  return `${event}:${detail}`;
}

export function markLearnerEventFired(key: string): boolean {
  if (fired.has(key)) return false;
  fired.add(key);
  return true;
}
