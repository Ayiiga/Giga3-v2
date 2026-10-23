"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { getSessionToken, getUserEmail } from "@/lib/auth";
import {
  FOUNDING_MEMBERS_ACCESS_DURATION_LABEL,
  FOUNDING_MEMBERS_MAX_ALLOCATIONS,
  FOUNDING_MEMBERS_PRICE_GHS,
  FOUNDING_MEMBERS_PRODUCT_ID,
  FOUNDING_MEMBERS_SCOPE_BULLETS,
} from "@/lib/gigalearn/examPractice/foundingMembersOffer";
import { EXAM_PRACTICE_DESTINATIONS } from "@/lib/gigalearn/examPractice/centreConfig";
import { EXAM_PRACTICE_PAID_UNLOCK_COPY } from "@/lib/gigalearn/examPractice/practiceLimits";
import { dismissPremiumUpgradeModal } from "@/lib/gigalearn/examPractice/premiumUpgradeDismiss";
import {
  initializePaystackPayment,
  redirectToPaystack,
} from "@/lib/payments/paystackService";
import { channelsForPayMethod } from "@/lib/billing/paystackPacks";
import { SUBSCRIPTION_PLANS } from "@/lib/payments/subscriptionCatalog";

export type PremiumUpgradeScore = {
  correct: number;
  total: number;
  percent: number;
  answered: number;
};

type Props = {
  open: boolean;
  setId: string;
  score: PremiumUpgradeScore;
  onClose: () => void;
  onViewResults: () => void;
};

const BASIC = SUBSCRIPTION_PLANS.basic;

export function PremiumUpgradeModal({
  open,
  setId,
  score,
  onClose,
  onViewResults,
}: Props) {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [busy, setBusy] = useState<"ghs30" | "ghs60" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSessionToken(getSessionToken());
  }, []);

  const status = useQuery(
    api.foundingMembersOffer.getOfferStatus,
    open ? { sessionToken: sessionToken ?? undefined } : "skip"
  );
  const recordEvent = useMutation(api.foundingMembersOffer.recordOfferEvent);
  const initializePayment = useAction(api.paystack.initializePayment);

  useEffect(() => {
    if (!open) return;
    void recordEvent({
      eventType: "upgrade_modal_shown",
      sessionToken: sessionToken ?? undefined,
      meta: `score=${score.percent}`,
    }).catch(() => undefined);
  }, [open, recordEvent, sessionToken, score.percent]);

  if (!open) return null;

  const signedIn = Boolean(sessionToken && getUserEmail());
  const soldOut = Boolean(status?.soldOut);
  const live = Boolean(status?.liveCheckoutEnabled);
  const remaining = status?.remaining;
  const alreadyPremium = Boolean(
    status?.viewer.alreadyPurchased || status?.viewer.hasActivePremiumAccess
  );
  const basicPrice = BASIC?.priceGhs ?? 60;

  function maybeLater() {
    dismissPremiumUpgradeModal(setId);
    void recordEvent({
      eventType: "upgrade_modal_dismissed",
      sessionToken: sessionToken ?? undefined,
    }).catch(() => undefined);
    onClose();
  }

  function viewResults() {
    dismissPremiumUpgradeModal(setId);
    onViewResults();
  }

  async function checkout(productId: string, kind: "ghs30" | "ghs60") {
    setError(null);
    if (!sessionToken) {
      setError("Sign in to continue with payment.");
      return;
    }
    if (kind === "ghs30") {
      if (!live) {
        setError(
          "The Founding Teacher offer is prepared but not live yet. Use the GHS 60 subscription, or try again after activation."
        );
        return;
      }
      if (soldOut) {
        setError("The Founding Teacher offer is sold out (all 30 successful purchases claimed).");
        return;
      }
      if (alreadyPremium) {
        setError("You already have Teacher Promotion premium access.");
        return;
      }
    }
    setBusy(kind);
    void recordEvent({
      eventType: kind === "ghs30" ? "upgrade_ghs30_selected" : "upgrade_ghs60_selected",
      sessionToken,
    }).catch(() => undefined);
    try {
      const result = await initializePaystackPayment(
        (args) => initializePayment(args),
        {
          sessionToken,
          productId,
          channels: channelsForPayMethod("momo"),
        }
      );
      void recordEvent({
        eventType: "payment_initiated",
        sessionToken,
        meta: productId,
      }).catch(() => undefined);
      redirectToPaystack(result.authorizationUrl);
    } catch (err) {
      setBusy(null);
      setError(err instanceof Error ? err.message : "Checkout failed.");
    }
  }

  return (
    <div
      className="premium-upgrade-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="premium-upgrade-title"
      data-testid="premium-upgrade-modal"
    >
      <div className="premium-upgrade-modal">
        <button
          type="button"
          className="premium-upgrade-close"
          aria-label="Close upgrade offer"
          onClick={maybeLater}
        >
          ×
        </button>

        <p className="premium-upgrade-kicker">GES Teacher Promotion Practice</p>
        <h2 id="premium-upgrade-title" className="premium-upgrade-title">
          You&apos;ve completed your free practice!
        </h2>
        <p className="premium-upgrade-score" data-testid="premium-upgrade-score">
          Score {score.percent}% · {score.correct}/{score.total} correct
          {score.answered < score.total ? ` · ${score.answered} answered` : ""}
        </p>
        <p className="premium-upgrade-lead">
          Ready to continue preparing for your next promotion? Unlock more available
          rank-specific practice questions and keep building your confidence.
        </p>

        {alreadyPremium ? (
          <div className="premium-upgrade-option" data-testid="premium-upgrade-already">
            <p className="premium-upgrade-option-label">Premium already active</p>
            <p className="premium-upgrade-option-copy">
              Your account already unlocks eligible Teacher Promotion full packs. No purchase
              needed.
            </p>
            <Link
              href={EXAM_PRACTICE_DESTINATIONS.teacherPromotionPracticeFull}
              className="premium-upgrade-cta"
            >
              Open premium practice
            </Link>
          </div>
        ) : (
          <>
            <div
              className="premium-upgrade-option premium-upgrade-option--founding"
              data-testid="premium-upgrade-ghs30"
            >
              <p className="premium-upgrade-option-label">Founding Teacher Offer</p>
              <p className="premium-upgrade-option-price">
                GHS {FOUNDING_MEMBERS_PRICE_GHS}
                <span> one-time</span>
              </p>
              <p className="premium-upgrade-option-copy">
                Unlock Teacher Promotion Premium for just GHS {FOUNDING_MEMBERS_PRICE_GHS}.
                Limited to the first {FOUNDING_MEMBERS_MAX_ALLOCATIONS}{" "}
                <strong>successful purchases</strong>
                {typeof remaining === "number" ? (
                  <>
                    {" "}
                    · <span data-testid="premium-upgrade-remaining">{remaining} remaining</span>
                  </>
                ) : null}
                . Access for {FOUNDING_MEMBERS_ACCESS_DURATION_LABEL} after verification (scoped
                Exam Practice premium — not a full AI credit subscription).
              </p>
              <ul className="premium-upgrade-bullets">
                {FOUNDING_MEMBERS_SCOPE_BULLETS.slice(0, 3).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {soldOut ? (
                <p className="premium-upgrade-soldout" role="status">
                  Sold out — all {FOUNDING_MEMBERS_MAX_ALLOCATIONS} successful purchases claimed.
                </p>
              ) : !live ? (
                <p className="premium-upgrade-note" role="status">
                  Offer prepared; live checkout awaits admin activation (
                  <code>FOUNDING_MEMBERS_OFFER_LIVE</code>).
                </p>
              ) : null}
              {signedIn ? (
                <button
                  type="button"
                  className="premium-upgrade-cta"
                  disabled={Boolean(busy) || soldOut || !live}
                  data-testid="premium-upgrade-ghs30-btn"
                  onClick={() =>
                    void checkout(FOUNDING_MEMBERS_PRODUCT_ID, "ghs30")
                  }
                >
                  {busy === "ghs30"
                    ? "Starting Paystack…"
                    : `Unlock Premium — GHS ${FOUNDING_MEMBERS_PRICE_GHS}`}
                </button>
              ) : (
                <Link
                  href={`/chat/login/?next=${encodeURIComponent("/gigalearn/exam/practice/")}`}
                  className="premium-upgrade-cta"
                >
                  Sign in to unlock — GHS {FOUNDING_MEMBERS_PRICE_GHS}
                </Link>
              )}
            </div>

            <div
              className="premium-upgrade-option"
              data-testid="premium-upgrade-ghs60"
            >
              <p className="premium-upgrade-option-label">Monthly subscription</p>
              <p className="premium-upgrade-option-price">
                GHS {basicPrice}
                <span>/month</span>
              </p>
              <p className="premium-upgrade-option-copy">
                Subscribe with the existing <strong>Basic</strong> plan ({EXAM_PRACTICE_PAID_UNLOCK_COPY.split(",")[0]}
                ). Unlocks eligible Teacher Promotion full packs while the subscription is active,
                plus {BASIC?.credits ?? 100} AI credits each billing period. Renews automatically
                when a reusable card is saved; manage auto-renew from your account / wallet.
              </p>
              {signedIn ? (
                <button
                  type="button"
                  className="premium-upgrade-cta premium-upgrade-cta--secondary"
                  disabled={Boolean(busy)}
                  data-testid="premium-upgrade-ghs60-btn"
                  onClick={() => void checkout("sub_basic_monthly", "ghs60")}
                >
                  {busy === "ghs60"
                    ? "Starting Paystack…"
                    : `Subscribe — GHS ${basicPrice}/month`}
                </button>
              ) : (
                <Link
                  href={`/chat/login/?next=${encodeURIComponent("/subscribe/")}`}
                  className="premium-upgrade-cta premium-upgrade-cta--secondary"
                >
                  Sign in to subscribe — GHS {basicPrice}/month
                </Link>
              )}
            </div>

            <div
              className="premium-upgrade-option"
              data-testid="premium-upgrade-credits"
            >
              <p className="premium-upgrade-option-label">Credit purchase</p>
              <p className="premium-upgrade-option-copy">
                Buying any Giga3 <strong>credit pack</strong> (existing Paystack packs) records a
                credit purchase and unlocks the same Exam Practice full-pack gate as an active
                subscription. Residual wallet balance alone does <em>not</em> unlock packs — there
                is no per-question credit price for exam practice.
              </p>
              <Link
                href={EXAM_PRACTICE_DESTINATIONS.credits}
                className="premium-upgrade-cta premium-upgrade-cta--ghost"
                data-testid="premium-upgrade-credits-btn"
                onClick={() => {
                  void recordEvent({
                    eventType: "upgrade_credits_selected",
                    sessionToken: sessionToken ?? undefined,
                  }).catch(() => undefined);
                }}
              >
                View credit options
              </Link>
            </div>
          </>
        )}

        <p className="premium-upgrade-footer-note">
          Review the access details and payment terms before purchasing. Not an official GES
          examination paper. Rank banks show published counts only — we do not claim 550 questions
          per rank when fewer are published.
        </p>

        {error ? (
          <p className="premium-upgrade-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="premium-upgrade-actions">
          <button
            type="button"
            className="premium-upgrade-cta premium-upgrade-cta--ghost"
            data-testid="premium-upgrade-view-results"
            onClick={viewResults}
          >
            View my results
          </button>
          <button
            type="button"
            className="premium-upgrade-cta premium-upgrade-cta--ghost"
            data-testid="premium-upgrade-maybe-later"
            onClick={maybeLater}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
