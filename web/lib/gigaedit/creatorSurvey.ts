/**
 * GigaEdits signed-in creator survey (Option A).
 * Encodes answers into platformFeedback.submitFeedback body + rating.
 * No new Convex table or mutation.
 */

import {
  GIGAEDIT_STARTER_PACK_IDS,
  type GigaEditStarterPackId,
} from "@/lib/gigaedit/templates";

export const CREATOR_SURVEY_TITLE = "GigaEdits Starter Pack survey";
export const CREATOR_SURVEY_VERSION = 1;
export const CREATOR_SURVEY_FEEDBACK_TYPE = "general" as const;

/** localStorage flags only — never store answer text here. */
const STORAGE_PREFIX = "giga3_gigaedit_survey_v1";

export type SurveyStarterChoice = GigaEditStarterPackId | "other";

export type SurveyTaskCompleted = "yes" | "partly" | "no";
export type SurveyExportSaved = "yes" | "no" | "not_attempted";
export type SurveyReuse = "yes" | "maybe" | "no";
export type SurveyWtp = "yes" | "maybe" | "no" | "not_sure";
export type SurveyPriceHypothesis =
  | ""
  | "too_high"
  | "about_right"
  | "too_low"
  | "prefer_not";

export type CreatorSurveyAnswers = {
  starter: SurveyStarterChoice;
  taskCompleted: SurveyTaskCompleted;
  exportSaved: SurveyExportSaved;
  /** Ease of use 1–5 — maps directly to submitFeedback.rating */
  ease: 1 | 2 | 3 | 4 | 5;
  difficulty: string;
  reuse: SurveyReuse;
  improvement: string;
  wtp: SurveyWtp;
  priceHypothesis: SurveyPriceHypothesis;
  /** Optional product-research consent — not marketing. */
  researchConsent: boolean;
  projectId?: string;
  trigger: "export_confirmed" | "manual";
};

export type CreatorSurveyOffer = {
  projectId?: string;
  /** Resolved starter pack id, or null when unknown. */
  starterId?: GigaEditStarterPackId | null;
  /** True only after saveExportedFileToDevice succeeded. */
  exportConfirmed: boolean;
  source: "video_download" | "publish_save" | "manual";
};

export type CreatorSurveySubmitPayload = {
  type: typeof CREATOR_SURVEY_FEEDBACK_TYPE;
  title: string;
  body: string;
  rating: number;
};

const STARTER_LABELS: Record<SurveyStarterChoice, string> = {
  "hook-reel": "Hook Reel",
  "yt-intro": "YouTube Intro",
  "poster-promo": "Promo Poster",
  other: "Other / not sure",
};

const EASE_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "Very difficult",
  2: "Difficult",
  3: "Neutral",
  4: "Easy",
  5: "Very easy",
};

type OfferListener = (offer: CreatorSurveyOffer) => void;
let offerListener: OfferListener | null = null;

export function subscribeCreatorSurveyOffers(listener: OfferListener): () => void {
  offerListener = listener;
  return () => {
    if (offerListener === listener) offerListener = null;
  };
}

/** Offer the survey UI (host decides dismiss/submit gates). */
export function offerCreatorSurvey(offer: CreatorSurveyOffer): void {
  offerListener?.(offer);
}

export function resolveStarterFromNotes(
  notes?: string | null
): GigaEditStarterPackId | null {
  if (!notes || typeof notes !== "string") return null;
  const id = notes.trim();
  return (GIGAEDIT_STARTER_PACK_IDS as readonly string[]).includes(id)
    ? (id as GigaEditStarterPackId)
    : null;
}

export function starterChoiceLabel(choice: SurveyStarterChoice): string {
  return STARTER_LABELS[choice];
}

export function easeLabel(n: 1 | 2 | 3 | 4 | 5): string {
  return EASE_LABELS[n];
}

export function surveyProjectKey(projectId?: string | null): string {
  const trimmed = projectId?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "unknown";
}

function storageKey(kind: "dismissed" | "submitted", projectKey: string): string {
  return `${STORAGE_PREFIX}_${kind}_${projectKey}`;
}

export function isSurveyAutoPromptBlocked(projectId?: string | null): boolean {
  if (typeof window === "undefined") return false;
  try {
    const key = surveyProjectKey(projectId);
    return Boolean(
      localStorage.getItem(storageKey("dismissed", key)) ||
        localStorage.getItem(storageKey("submitted", key))
    );
  } catch {
    return false;
  }
}

export function isSurveySubmittedLocally(projectId?: string | null): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(localStorage.getItem(storageKey("submitted", surveyProjectKey(projectId))));
  } catch {
    return false;
  }
}

/** Dismissal flag only — never write survey answers here. */
export function markSurveyDismissed(projectId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey("dismissed", surveyProjectKey(projectId)), "1");
  } catch {
    /* localStorage unavailable — fail open */
  }
}

/** Call only after platformFeedback.submitFeedback confirms success. */
export function markSurveySubmitted(projectId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const key = surveyProjectKey(projectId);
    localStorage.setItem(storageKey("submitted", key), "1");
    localStorage.removeItem(storageKey("dismissed", key));
  } catch {
    /* localStorage unavailable — fail open */
  }
}

function sanitizeLine(text: string, max = 500): string {
  return text.replace(/\r?\n/g, " ").trim().slice(0, max);
}

/**
 * Versioned, human-readable body for the admin feedback dashboard.
 * rating is NOT embedded here — it is sent as submitFeedback.rating (ease 1–5).
 */
export function encodeCreatorSurveyBody(answers: CreatorSurveyAnswers): string {
  const lines = [
    `GigaEdits Creator Survey v${CREATOR_SURVEY_VERSION}`,
    `starter: ${answers.starter}`,
    `task_completed: ${answers.taskCompleted}`,
    `export_saved: ${answers.exportSaved}`,
    `ease: ${answers.ease}`,
    `difficulty: ${sanitizeLine(answers.difficulty) || "(none)"}`,
    `reuse_starter: ${answers.reuse}`,
    `improvement: ${sanitizeLine(answers.improvement) || "(none)"}`,
    `would_consider_paying: ${answers.wtp}`,
    `price_hypothesis_usd100_year: ${answers.priceHypothesis || "(skipped)"}`,
    `research_consent: ${answers.researchConsent ? "yes" : "no"}`,
    `trigger: ${answers.trigger}`,
    `project_id: ${surveyProjectKey(answers.projectId)}`,
    `client_submitted_at: ${new Date().toISOString()}`,
  ];
  return lines.join("\n").slice(0, 4000);
}

export function buildCreatorSurveySubmitPayload(
  answers: CreatorSurveyAnswers
): CreatorSurveySubmitPayload {
  if (answers.ease < 1 || answers.ease > 5 || !Number.isInteger(answers.ease)) {
    throw new Error("Ease rating must be an integer from 1 to 5.");
  }
  return {
    type: CREATOR_SURVEY_FEEDBACK_TYPE,
    title: CREATOR_SURVEY_TITLE,
    body: encodeCreatorSurveyBody(answers),
    rating: answers.ease,
  };
}

export function defaultSurveyAnswersFromOffer(
  offer: CreatorSurveyOffer
): Pick<CreatorSurveyAnswers, "starter" | "exportSaved" | "trigger" | "projectId"> {
  return {
    starter: offer.starterId ?? "other",
    exportSaved: offer.exportConfirmed ? "yes" : "not_attempted",
    trigger: offer.exportConfirmed ? "export_confirmed" : "manual",
    projectId: offer.projectId,
  };
}

/** True when required fields are present for submit (optional texts may be empty). */
export function canSubmitCreatorSurvey(
  answers: Pick<
    CreatorSurveyAnswers,
    "starter" | "taskCompleted" | "exportSaved" | "ease" | "reuse" | "wtp"
  >
): boolean {
  return Boolean(
    answers.starter &&
      answers.taskCompleted &&
      answers.exportSaved &&
      answers.ease >= 1 &&
      answers.ease <= 5 &&
      answers.reuse &&
      answers.wtp
  );
}
