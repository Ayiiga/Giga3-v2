"use client";

import {
  buildCreatorSurveySubmitPayload,
  canSubmitCreatorSurvey,
  defaultSurveyAnswersFromOffer,
  easeLabel,
  isSurveyAutoPromptBlocked,
  markSurveyDismissed,
  markSurveySubmitted,
  offerCreatorSurvey,
  shouldAutoOfferCreatorSurvey,
  starterChoiceLabel,
  subscribeCreatorSurveyOffers,
  type CreatorSurveyAnswers,
  type CreatorSurveyOffer,
  type SurveyExportSaved,
  type SurveyPriceHypothesis,
  type SurveyReuse,
  type SurveyStarterChoice,
  type SurveyTaskCompleted,
  type SurveyWtp,
} from "@/lib/gigaedit/creatorSurvey";
import { getSessionToken } from "@/lib/auth";
import { api } from "convex/_generated/api";
import { useMutation } from "convex/react";
import Link from "next/link";
import { FormEvent, useEffect, useId, useRef, useState } from "react";

type DraftState = CreatorSurveyAnswers;

function emptyDraft(offer: CreatorSurveyOffer): DraftState {
  const defaults = defaultSurveyAnswersFromOffer(offer);
  return {
    starter: defaults.starter,
    taskCompleted: "yes",
    exportSaved: defaults.exportSaved,
    ease: 3,
    difficulty: "",
    reuse: "maybe",
    improvement: "",
    wtp: "not_sure",
    priceHypothesis: "",
    researchConsent: false,
    projectId: defaults.projectId,
    trigger: defaults.trigger,
  };
}

function ChoiceRow<T extends string>({
  name,
  value,
  options,
  onChange,
  legend,
}: {
  name: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (next: T) => void;
  legend: string;
}) {
  return (
    <fieldset className="gigaedit-survey-fieldset">
      <legend className="gigaedit-survey-legend">{legend}</legend>
      <div className="gigaedit-survey-choices" role="radiogroup" aria-label={legend}>
        {options.map((opt) => (
          <label key={opt.id} className="gigaedit-survey-choice">
            <input
              type="radio"
              name={name}
              value={opt.id}
              checked={value === opt.id}
              onChange={() => onChange(opt.id)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function CreatorSurveyHost() {
  const titleId = useId();
  const submitFeedback = useMutation(api.platformFeedback.submitFeedback);
  const [open, setOpen] = useState(false);
  const [offer, setOffer] = useState<CreatorSurveyOffer | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const lastAutoKeyRef = useRef<string>("");
  const submittingLockRef = useRef(false);

  useEffect(() => {
    return subscribeCreatorSurveyOffers((next) => {
      const sessionToken = getSessionToken();
      const isManual = next.source === "manual";

      // Cancelled share sheets must never auto-open the survey.
      if (!isManual && !shouldAutoOfferCreatorSurvey(next.deviceSaveOutcome)) {
        return;
      }

      if (!isManual && isSurveyAutoPromptBlocked(next.projectId)) {
        return;
      }

      // Dedupe rapid remount / double callbacks for the same auto offer.
      if (!isManual) {
        const autoKey = `${next.projectId ?? "unknown"}:${next.source}:${next.deviceSaveOutcome ?? "none"}`;
        if (lastAutoKeyRef.current === autoKey) return;
        lastAutoKeyRef.current = autoKey;
      }

      setOffer(next);
      setDraft(emptyDraft(next));
      setSubmitted(false);
      setError(null);
      setSignedIn(Boolean(sessionToken));
      setOpen(true);
    });
  }, []);

  function closeWithoutSubmit() {
    if (offer) markSurveyDismissed(offer.projectId);
    setOpen(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft || submittingLockRef.current) return;
    if (!canSubmitCreatorSurvey(draft)) {
      setError("Please answer the required questions, then try again.");
      return;
    }
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      setSignedIn(false);
      setError("Sign in to submit feedback. Your answers are still here.");
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setError("You appear to be offline. Your answers are saved in this form — retry when connected.");
      return;
    }

    submittingLockRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const payload = buildCreatorSurveySubmitPayload(draft);
      await submitFeedback({
        sessionToken,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        rating: payload.rating,
      });
      markSurveySubmitted(draft.projectId);
      setSubmitted(true);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Could not send feedback. Your answers are still here — try again.";
      setError(
        /rate|too many|limit/i.test(message)
          ? "Feedback rate limit reached. Your answers are still here — try again later."
          : message
      );
    } finally {
      submittingLockRef.current = false;
      setSubmitting(false);
    }
  }

  if (!open || !draft) return null;

  return (
    <div
      className="gigaedit-survey-backdrop"
      role="presentation"
      onClick={(ev) => {
        if (ev.target === ev.currentTarget && !submitting) closeWithoutSubmit();
      }}
    >
      <div
        className="gigaedit-survey-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="gigaedit-survey-header">
          <h2 id={titleId} className="gigaedit-survey-title">
            Help improve GigaEdits
          </h2>
          <button
            type="button"
            className="gigaedit-survey-close"
            onClick={closeWithoutSubmit}
            aria-label="Skip survey"
          >
            ×
          </button>
        </div>

        {submitted ? (
          <div className="gigaedit-survey-success" role="status">
            <p className="font-semibold">Thank you — feedback sent.</p>
            <p className="mt-1 text-xs text-[var(--ge-muted)]">
              Your answers help us improve GigaEdits. You can keep editing anytime.
            </p>
            <button
              type="button"
              className="gigaedit-survey-btn gigaedit-survey-btn--primary mt-4"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
        ) : (
          <form className="gigaedit-survey-form" onSubmit={(ev) => void handleSubmit(ev)}>
            {!signedIn ? (
              <p className="gigaedit-survey-banner" role="status">
                Sign in to submit this optional survey.{" "}
                <Link href="/chat/login/?next=%2Fgigaedit%2F" className="underline">
                  Sign in
                </Link>
              </p>
            ) : null}

            <ChoiceRow<SurveyStarterChoice>
              name="starter"
              legend="1. Which starter did you test?"
              value={draft.starter}
              onChange={(starter) => setDraft((d) => (d ? { ...d, starter } : d))}
              options={[
                { id: "hook-reel", label: starterChoiceLabel("hook-reel") },
                { id: "yt-intro", label: starterChoiceLabel("yt-intro") },
                { id: "poster-promo", label: starterChoiceLabel("poster-promo") },
                { id: "other", label: starterChoiceLabel("other") },
              ]}
            />

            <ChoiceRow<SurveyTaskCompleted>
              name="task"
              legend="2. Were you able to complete your intended task?"
              value={draft.taskCompleted}
              onChange={(taskCompleted) => setDraft((d) => (d ? { ...d, taskCompleted } : d))}
              options={[
                { id: "yes", label: "Yes" },
                { id: "partly", label: "Partly" },
                { id: "no", label: "No" },
              ]}
            />

            <ChoiceRow<SurveyExportSaved>
              name="export"
              legend="3. Did your export save successfully to your device?"
              value={draft.exportSaved}
              onChange={(exportSaved) => setDraft((d) => (d ? { ...d, exportSaved } : d))}
              options={[
                { id: "yes", label: "Yes" },
                { id: "no", label: "No" },
                {
                  id: "not_confirmed",
                  label: "Not confirmed (share/download started; gallery not verified)",
                },
                { id: "not_attempted", label: "I did not attempt an export" },
              ]}
            />

            <fieldset className="gigaedit-survey-fieldset">
              <legend className="gigaedit-survey-legend">4. How easy was GigaEdits to use?</legend>
              <div className="gigaedit-survey-ease" role="radiogroup" aria-label="Ease of use from 1 to 5">
                {([1, 2, 3, 4, 5] as const).map((n) => (
                  <label key={n} className="gigaedit-survey-ease-option">
                    <input
                      type="radio"
                      name="ease"
                      value={n}
                      checked={draft.ease === n}
                      onChange={() => setDraft((d) => (d ? { ...d, ease: n } : d))}
                    />
                    <span aria-hidden>{n}</span>
                    <span className="sr-only">{easeLabel(n)}</span>
                  </label>
                ))}
              </div>
              <p className="gigaedit-survey-hint">1 = Very difficult · 5 = Very easy</p>
            </fieldset>

            <label className="gigaedit-survey-fieldset">
              <span className="gigaedit-survey-legend">5. What was the biggest difficulty? (optional)</span>
              <textarea
                className="gigaedit-survey-textarea"
                rows={2}
                maxLength={400}
                value={draft.difficulty}
                onChange={(ev) =>
                  setDraft((d) => (d ? { ...d, difficulty: ev.target.value } : d))
                }
              />
            </label>

            <ChoiceRow<SurveyReuse>
              name="reuse"
              legend="6. Would you use this starter again?"
              value={draft.reuse}
              onChange={(reuse) => setDraft((d) => (d ? { ...d, reuse } : d))}
              options={[
                { id: "yes", label: "Yes" },
                { id: "maybe", label: "Maybe" },
                { id: "no", label: "No" },
              ]}
            />

            <label className="gigaedit-survey-fieldset">
              <span className="gigaedit-survey-legend">
                7. What one improvement would help you most? (optional)
              </span>
              <textarea
                className="gigaedit-survey-textarea"
                rows={2}
                maxLength={400}
                value={draft.improvement}
                onChange={(ev) =>
                  setDraft((d) => (d ? { ...d, improvement: ev.target.value } : d))
                }
              />
            </label>

            <ChoiceRow<SurveyWtp>
              name="wtp"
              legend="8. Would you consider paying for GigaEdits?"
              value={draft.wtp}
              onChange={(wtp) => setDraft((d) => (d ? { ...d, wtp } : d))}
              options={[
                { id: "yes", label: "Yes" },
                { id: "maybe", label: "Maybe" },
                { id: "no", label: "No" },
                { id: "not_sure", label: "Not sure" },
              ]}
            />

            <ChoiceRow<SurveyPriceHypothesis>
              name="price"
              legend="9. Optional — research hypothesis only (not a real price or plan): how does about US$100/year sound?"
              value={draft.priceHypothesis}
              onChange={(priceHypothesis) =>
                setDraft((d) => (d ? { ...d, priceHypothesis } : d))
              }
              options={[
                { id: "", label: "Skip" },
                { id: "too_high", label: "Too high" },
                { id: "about_right", label: "About right" },
                { id: "too_low", label: "Too low" },
                { id: "prefer_not", label: "Prefer not to say" },
              ]}
            />

            <label className="gigaedit-survey-consent">
              <input
                type="checkbox"
                checked={draft.researchConsent}
                onChange={(ev) =>
                  setDraft((d) => (d ? { ...d, researchConsent: ev.target.checked } : d))
                }
              />
              <span>
                Optional: I agree Giga3 may use this product feedback to improve GigaEdits. This is
                not a marketing signup.
              </span>
            </label>

            {error ? (
              <p className="gigaedit-survey-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="gigaedit-survey-actions">
              <button
                type="button"
                className="gigaedit-survey-btn gigaedit-survey-btn--ghost"
                onClick={closeWithoutSubmit}
                disabled={submitting}
              >
                Skip
              </button>
              <button
                type="submit"
                className="gigaedit-survey-btn gigaedit-survey-btn--primary"
                disabled={submitting || !signedIn}
              >
                {submitting ? "Sending…" : "Submit feedback"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/** Non-blocking manual entry — does not mark export successful. */
export function CreatorSurveyManualLink(props: {
  projectId?: string;
  starterId?: string | null;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={props.className ?? "gigaedit-survey-entry"}
      onClick={() => {
        const starter =
          props.starterId === "hook-reel" ||
          props.starterId === "yt-intro" ||
          props.starterId === "poster-promo"
            ? props.starterId
            : null;
        offerCreatorSurvey({
          projectId: props.projectId,
          starterId: starter,
          deviceSaveOutcome: null,
          source: "manual",
        });
      }}
    >
      Finished testing? Share feedback
    </button>
  );
}
