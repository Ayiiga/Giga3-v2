/**
 * Pure GigaSocial UGC report policy — unit-tested, no Convex runtime.
 * Queues reports for human review; never auto-removes content.
 */

export const SOCIAL_CONTENT_REPORT_REASONS = [
  "spam",
  "harassment",
  "sexual_content",
  "hate",
  "violence",
  "child_safety",
  "copyright",
  "impersonation",
  "other",
] as const;

export type SocialContentReportReason = (typeof SOCIAL_CONTENT_REPORT_REASONS)[number];

export type SocialContentReportTargetType = "post" | "comment" | "profile";

/** Max open/recent reports a single user may submit per rolling window. */
export const SOCIAL_REPORT_RATE_LIMIT_MAX = 20;
export const SOCIAL_REPORT_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

/** Same reporter + same target + same reason within this window is treated as a duplicate. */
export const SOCIAL_REPORT_DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

const REASON_SET = new Set<string>(SOCIAL_CONTENT_REPORT_REASONS);

export function normalizeSocialReportReason(reason: string): SocialContentReportReason | null {
  const normalized = reason.trim().toLowerCase().slice(0, 40);
  if (!REASON_SET.has(normalized)) return null;
  return normalized as SocialContentReportReason;
}

export function socialReportTargetKey(args: {
  targetType: SocialContentReportTargetType;
  postId?: string;
  commentId?: string;
  profileUserId?: string;
}): string | null {
  if (args.targetType === "post") {
    const id = args.postId?.trim();
    return id ? `post:${id}` : null;
  }
  if (args.targetType === "comment") {
    const id = args.commentId?.trim();
    return id ? `comment:${id}` : null;
  }
  const profileUserId = args.profileUserId?.trim().toLowerCase();
  return profileUserId ? `profile:${profileUserId}` : null;
}

export type ExistingSocialReportLike = {
  targetType: SocialContentReportTargetType;
  postId?: string;
  commentId?: string;
  profileUserId?: string;
  reason: string;
  status: string;
  createdAt: number;
};

export function isDuplicateSocialReport(
  existing: ExistingSocialReportLike,
  candidate: {
    targetType: SocialContentReportTargetType;
    postId?: string;
    commentId?: string;
    profileUserId?: string;
    reason: string;
    nowMs: number;
  }
): boolean {
  if (existing.status !== "open") return false;
  if (existing.reason !== candidate.reason) return false;
  if (candidate.nowMs - existing.createdAt > SOCIAL_REPORT_DEDUPE_WINDOW_MS) return false;
  const a = socialReportTargetKey(existing);
  const b = socialReportTargetKey(candidate);
  return Boolean(a && b && a === b);
}

export function countReportsInWindow(
  reports: Array<{ createdAt: number }>,
  nowMs: number,
  windowMs: number = SOCIAL_REPORT_RATE_LIMIT_WINDOW_MS
): number {
  const cutoff = nowMs - windowMs;
  return reports.filter((r) => r.createdAt >= cutoff).length;
}

export function isSocialReportRateLimited(recentCount: number): boolean {
  return recentCount >= SOCIAL_REPORT_RATE_LIMIT_MAX;
}

export function isSelfReport(args: {
  reporterId: string;
  targetAuthorId?: string | null;
}): boolean {
  const reporter = args.reporterId.trim().toLowerCase();
  const author = args.targetAuthorId?.trim().toLowerCase();
  return Boolean(author && author === reporter);
}
