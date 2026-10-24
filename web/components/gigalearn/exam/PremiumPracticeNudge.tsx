"use client";

import Link from "next/link";
import { EXAM_PRACTICE_DESTINATIONS } from "@/lib/gigalearn/examPractice/centreConfig";
import {
  EXAM_PRACTICE_FREE_QUESTION_COUNT,
  EXAM_PRACTICE_PAID_UNLOCK_COPY,
} from "@/lib/gigalearn/examPractice/practiceLimits";
import {
  FOUNDING_MEMBERS_MAX_ALLOCATIONS,
  FOUNDING_MEMBERS_PRICE_GHS,
} from "@/lib/gigalearn/examPractice/foundingMembersOffer";

type Variant = "prestart" | "insession" | "results" | "locked";

type Props = {
  variant: Variant;
  onOpenUpgrade?: () => void;
  className?: string;
};

export function PremiumPracticeNudge({ variant, onOpenUpgrade, className }: Props) {
  if (variant === "prestart") {
    return (
      <aside
        className={`premium-nudge premium-nudge--hero ${className ?? ""}`}
        data-testid="premium-nudge-prestart"
      >
        <p className="premium-nudge-eyebrow">Prepare smarter for your GES promotion</p>
        <p className="premium-nudge-body">
          Start with free practice to understand the question format and check your performance.
          When you finish, you can review your results and choose whether to unlock more practice.
        </p>
        <p className="premium-nudge-body">
          Free trial: {EXAM_PRACTICE_FREE_QUESTION_COUNT} questions. After results, options include
          the Founding Teacher offer (GHS {FOUNDING_MEMBERS_PRICE_GHS} · 30 days · first{" "}
          {FOUNDING_MEMBERS_MAX_ALLOCATIONS} successful purchases) or Basic GHS 60/month — only if
          you choose to continue.
        </p>
      </aside>
    );
  }

  if (variant === "insession") {
    return (
      <aside
        className={`premium-nudge premium-nudge--inline ${className ?? ""}`}
        data-testid="premium-nudge-insession"
      >
        <p className="premium-nudge-body">
          Free trial in progress. When you finish, you can unlock rank-specific full packs with{" "}
          {EXAM_PRACTICE_PAID_UNLOCK_COPY}, or the Founding Teacher offer (GHS{" "}
          {FOUNDING_MEMBERS_PRICE_GHS} · first {FOUNDING_MEMBERS_MAX_ALLOCATIONS} successful
          purchases).
        </p>
      </aside>
    );
  }

  if (variant === "locked") {
    return (
      <aside
        className={`premium-nudge premium-nudge--locked ${className ?? ""}`}
        data-testid="premium-nudge-locked"
      >
        <p className="premium-nudge-eyebrow">Premium practice</p>
        <p className="premium-nudge-body">
          Full packs need an active Basic+ subscription, a credit-pack purchase, or the Founding
          Teacher offer. Free orientation stays at {EXAM_PRACTICE_FREE_QUESTION_COUNT} questions.
        </p>
        <div className="premium-nudge-actions">
          {onOpenUpgrade ? (
            <button type="button" className="premium-nudge-btn" onClick={onOpenUpgrade}>
              View upgrade options
            </button>
          ) : (
            <Link href={EXAM_PRACTICE_DESTINATIONS.examHome} className="premium-nudge-btn">
              View upgrade options
            </Link>
          )}
          <Link
            href={EXAM_PRACTICE_DESTINATIONS.credits}
            className="premium-nudge-btn premium-nudge-btn--ghost"
          >
            Credits / plans
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`premium-nudge premium-nudge--results ${className ?? ""}`}
      data-testid="premium-nudge-results"
    >
      <p className="premium-nudge-eyebrow">Keep preparing</p>
      <p className="premium-nudge-body">
        Unlock more available Teacher Promotion practice with the Founding Teacher offer (GHS{" "}
        {FOUNDING_MEMBERS_PRICE_GHS}) or Basic GHS 60/month.
      </p>
      {onOpenUpgrade ? (
        <button
          type="button"
          className="premium-nudge-btn"
          data-testid="premium-nudge-open-modal"
          onClick={onOpenUpgrade}
        >
          Unlock Premium options
        </button>
      ) : null}
    </aside>
  );
}
