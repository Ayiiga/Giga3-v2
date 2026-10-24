/** Client-facing labels for GigaSocial UGC report reasons (mirror Convex policy). */

export const SOCIAL_CONTENT_REPORT_OPTIONS = [
  { id: "spam", label: "Spam or scam" },
  { id: "harassment", label: "Harassment or bullying" },
  { id: "sexual_content", label: "Sexual or nude content" },
  { id: "hate", label: "Hate or discrimination" },
  { id: "violence", label: "Violence or threats" },
  { id: "child_safety", label: "Child safety concern" },
  { id: "copyright", label: "Copyright infringement" },
  { id: "impersonation", label: "Impersonation" },
  { id: "other", label: "Other" },
] as const;

export type SocialContentReportReasonId =
  (typeof SOCIAL_CONTENT_REPORT_OPTIONS)[number]["id"];

export type SocialContentReportTarget =
  | { targetType: "post"; postId: string }
  | { targetType: "comment"; commentId: string }
  | { targetType: "profile"; profileUserId: string };

export const SOCIAL_REPORT_SUCCESS_MESSAGE =
  "Thanks — your report was submitted for review. Content is not removed automatically.";

export const SOCIAL_REPORT_ALREADY_MESSAGE =
  "You already reported this. Our team can still review the earlier report.";
