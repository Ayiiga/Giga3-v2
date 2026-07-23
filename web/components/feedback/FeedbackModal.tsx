"use client";

import { Button } from "@/components/ui/Button";
import { usePhase5Flags } from "@/hooks/usePhase5Flags";
import { getSessionToken } from "@/lib/auth";
import type { FeedbackType } from "@/lib/platform/types";
import { api } from "convex/_generated/api";
import { useMutation } from "convex/react";
import { Bug, Flag, Lightbulb, MessageSquare, Star, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

const BASE_FEEDBACK_TYPES: { id: FeedbackType; label: string; icon: typeof Bug }[] = [
  { id: "general", label: "Send feedback", icon: MessageSquare },
  { id: "bug", label: "Report bug", icon: Bug },
  { id: "feature", label: "Request feature", icon: Lightbulb },
  { id: "ai_rating", label: "Rate AI response", icon: Star },
  { id: "incorrect_info", label: "Report incorrect info", icon: MessageSquare },
];

const PHASE5_FEEDBACK_TYPES: { id: FeedbackType; label: string; icon: typeof Bug }[] = [
  { id: "usability", label: "Usability feedback", icon: Lightbulb },
  { id: "content_report", label: "Report content", icon: Flag },
];

type FeedbackModalProps = {
  open: boolean;
  onClose: () => void;
  defaultType?: FeedbackType;
  messageId?: string;
  conversationId?: string;
};

export function FeedbackModal({
  open,
  onClose,
  defaultType = "general",
  messageId,
  conversationId,
}: FeedbackModalProps) {
  const phase5 = usePhase5Flags();
  const feedbackTypes = useMemo(
    () =>
      phase5.feedback
        ? [...BASE_FEEDBACK_TYPES, ...PHASE5_FEEDBACK_TYPES]
        : BASE_FEEDBACK_TYPES,
    [phase5.feedback]
  );
  const [type, setType] = useState<FeedbackType>(defaultType);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(0);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submitFeedback = useMutation(api.platformFeedback.submitFeedback);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const sessionToken = getSessionToken();
    if (!sessionToken) return;
    setSubmitting(true);
    try {
      await submitFeedback({
        sessionToken,
        type,
        title: title || feedbackTypes.find((t) => t.id === type)?.label || "Feedback",
        body,
        screenshotDataUrl: screenshot ?? undefined,
        messageId,
        conversationId,
        rating: rating > 0 ? rating : undefined,
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function captureScreenshot() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      stream.getTracks().forEach((t) => t.stop());
      setScreenshot(canvas.toDataURL("image/jpeg", 0.7));
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Feedback">
      <div className="premium-card w-full max-w-md p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Feedback</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-muted/50" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-6 text-center">
            <p className="font-medium text-foreground">Thank you!</p>
            <p className="mt-1 text-sm text-muted">Your feedback has been submitted for review.</p>
            <Button className="mt-4" size="sm" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {feedbackTypes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
                    type === t.id ? "border-accent bg-accent/10" : "border-border"
                  }`}
                  onClick={() => setType(t.id)}
                >
                  <t.icon className="h-3 w-3" aria-hidden />
                  {t.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Subject (optional)"
              className="input-surface w-full"
            />

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tell us more…"
              required
              rows={4}
              className="input-surface w-full resize-none"
            />

            {(type === "ai_rating" || type === "incorrect_info") && (
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`rounded p-1 ${rating >= n ? "text-accent" : "text-muted"}`}
                    onClick={() => setRating(n)}
                    aria-label={`Rate ${n} stars`}
                  >
                    <Star className="h-5 w-5" fill={rating >= n ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => void captureScreenshot()}>
                Attach screenshot
              </Button>
              {screenshot && <span className="self-center text-xs text-muted">Screenshot attached</span>}
            </div>

            <Button type="submit" className="w-full" disabled={submitting || !body.trim()}>
              {submitting ? "Sending…" : "Submit feedback"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
