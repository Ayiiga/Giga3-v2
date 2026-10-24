"use client";

import { Button } from "@/components/ui/Button";
import {
  SOCIAL_CONTENT_REPORT_OPTIONS,
  SOCIAL_REPORT_ALREADY_MESSAGE,
  SOCIAL_REPORT_SUCCESS_MESSAGE,
  type SocialContentReportReasonId,
  type SocialContentReportTarget,
} from "@/lib/gigasocial/socialContentReport";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Flag, X } from "lucide-react";
import { memo, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

type GigaSocialReportDialogProps = {
  open: boolean;
  sessionToken: string | null;
  target: SocialContentReportTarget | null;
  title?: string;
  onClose: () => void;
  onRequireAuth?: () => void;
  onSubmitted?: (message: string) => void;
};

export const GigaSocialReportDialog = memo(function GigaSocialReportDialog({
  open,
  sessionToken,
  target,
  title = "Report",
  onClose,
  onRequireAuth,
  onSubmitted,
}: GigaSocialReportDialogProps) {
  const reportSocialContent = useMutation(api.gigaSocial.reportSocialContent);
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [reason, setReason] = useState<SocialContentReportReasonId>("spam");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setReason("spam");
    setDetails("");
    setError(null);
    setSubmitting(false);
  }, [open, target]);

  if (!mounted || !open || !target) return null;

  async function handleSubmit() {
    if (!sessionToken) {
      onRequireAuth?.();
      return;
    }
    if (!target || submitting) return;
    const activeTarget = target;
    setSubmitting(true);
    setError(null);
    try {
      const result = await reportSocialContent({
        sessionToken,
        targetType: activeTarget.targetType,
        postId:
          activeTarget.targetType === "post"
            ? (activeTarget.postId as Id<"socialPosts">)
            : undefined,
        commentId:
          activeTarget.targetType === "comment"
            ? (activeTarget.commentId as Id<"socialComments">)
            : undefined,
        profileUserId:
          activeTarget.targetType === "profile"
            ? activeTarget.profileUserId
            : undefined,
        reason,
        details: details.trim() || undefined,
      });
      const message = result.alreadyReported
        ? SOCIAL_REPORT_ALREADY_MESSAGE
        : SOCIAL_REPORT_SUCCESS_MESSAGE;
      onSubmitted?.(message);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit report.");
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-3 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Flag className="h-4 w-4 shrink-0 text-red-700" aria-hidden />
            <h2 id={titleId} className="text-base font-semibold text-foreground">
              {title}
            </h2>
          </div>
          <button
            type="button"
            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full text-muted hover:bg-muted/40"
            onClick={onClose}
            aria-label="Close report dialog"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">
          Reports are reviewed by the Giga3 team. Submitting a report does not
          remove the content automatically.
        </p>

        <fieldset className="mt-4 space-y-2">
          <legend className="text-sm font-medium text-foreground">Reason</legend>
          {SOCIAL_CONTENT_REPORT_OPTIONS.map((option) => (
            <label
              key={option.id}
              className={cn(
                "flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm",
                reason === option.id
                  ? "border-accent bg-accent/5 text-foreground"
                  : "border-border text-foreground"
              )}
            >
              <input
                type="radio"
                name="gigasocial-report-reason"
                value={option.id}
                checked={reason === option.id}
                onChange={() => setReason(option.id)}
                className="accent-[var(--accent,#0f766e)]"
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <label className="mt-4 block text-sm">
          <span className="font-medium text-foreground">Details (optional)</span>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value.slice(0, 2000))}
            rows={3}
            className="mt-1 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            placeholder="Add context that helps reviewers."
          />
        </label>

        {error ? (
          <p className="mt-3 text-xs text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="min-h-10"
          >
            {submitting ? "Submitting…" : "Submit report"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
});
