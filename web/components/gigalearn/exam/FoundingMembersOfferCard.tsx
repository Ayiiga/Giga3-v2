"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { getSessionToken, getUserEmail } from "@/lib/auth";
import { rememberPostLoginPath } from "@/lib/auth/safePostLoginPath";
import {
  FOUNDING_MEMBERS_NOT_INCLUDED,
  FOUNDING_MEMBERS_SCOPE_BULLETS,
} from "@/lib/gigalearn/examPractice/foundingMembersOffer";
import { EXAM_PRACTICE_DESTINATIONS } from "@/lib/gigalearn/examPractice/centreConfig";
import {
  initializePaystackPayment,
  redirectToPaystack,
} from "@/lib/payments/paystackService";
import { channelsForPayMethod } from "@/lib/billing/paystackPacks";

type CheckoutPhase =
  | "idle"
  | "starting"
  | "redirecting"
  | "error";

export function FoundingMembersOfferCard() {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [phase, setPhase] = useState<CheckoutPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const impressed = useRef(false);

  useEffect(() => {
    setSessionToken(getSessionToken());
  }, []);

  const status = useQuery(api.foundingMembersOffer.getOfferStatus, {
    sessionToken: sessionToken ?? undefined,
  });
  const recordEvent = useMutation(api.foundingMembersOffer.recordOfferEvent);
  const initializePayment = useAction(api.paystack.initializePayment);

  useEffect(() => {
    if (!status || impressed.current) return;
    impressed.current = true;
    void recordEvent({
      eventType: status.soldOut ? "sold_out_view" : "impression",
      sessionToken: sessionToken ?? undefined,
    }).catch(() => {
      /* analytics best-effort */
    });
  }, [status, recordEvent, sessionToken]);

  const signedIn = Boolean(sessionToken && getUserEmail());

  async function startCheckout() {
    setError(null);
    if (!sessionToken) {
      setError("Sign in to unlock the Founding Members offer.");
      return;
    }
    if (!status?.liveCheckoutEnabled) {
      setError(
        "Live checkout is not enabled yet. Access duration is configured as 30 days — awaiting production activation."
      );
      return;
    }
    if (status.soldOut) {
      setError("This Founding Members offer is sold out.");
      return;
    }
    if (status.viewer.alreadyPurchased || status.viewer.hasActivePremiumAccess) {
      setError("You already have Teacher Promotion premium access.");
      return;
    }

    setPhase("starting");
    try {
      const result = await initializePaystackPayment(
        (args) => initializePayment(args),
        {
          sessionToken,
          productId: status.productId,
          channels: channelsForPayMethod("momo"),
        }
      );
      setPhase("redirecting");
      redirectToPaystack(result.authorizationUrl);
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Checkout failed.");
      void recordEvent({
        eventType: "checkout_abandon",
        sessionToken,
        meta: "checkout_error",
      }).catch(() => undefined);
    }
  }

  if (status === undefined) {
    return (
      <article
        className="exam-landing-card"
        data-testid="founding-members-offer-loading"
        aria-busy="true"
      >
        <p className="text-sm text-slate-600">Loading Founding Members offer…</p>
      </article>
    );
  }

  const {
    name,
    priceGhs,
    maxAllocations,
    remaining,
    soldOut,
    accessDurationLabel,
    liveCheckoutEnabled,
    viewer,
  } = status;

  if (viewer.alreadyPurchased || viewer.hasActivePremiumAccess) {
    return (
      <article
        className="exam-landing-card"
        data-testid="founding-members-already-premium"
        style={{ borderColor: "#86EFAC" }}
      >
        <span className="exam-landing-pill">Premium active</span>
        <h3 className="mt-3 text-base font-bold text-[#14532D]">
          Teacher Promotion premium is already on your account
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          You do not need this Founding Members seat. Full packs and rank practice unlock with
          your existing entitlement
          {viewer.examPracticePremiumExpiresAt
            ? ` (Founding Members access until ${new Date(
                viewer.examPracticePremiumExpiresAt
              ).toLocaleDateString("en-GB", { timeZone: "Africa/Accra" })} Africa/Accra)`
            : ""}
          .
        </p>
        <Link
          href={EXAM_PRACTICE_DESTINATIONS.teacherPromotionPracticeFull}
          className="exam-landing-cta mt-4"
        >
          Open full promotion practice
        </Link>
      </article>
    );
  }

  if (soldOut) {
    return (
      <article
        className="exam-landing-card"
        data-testid="founding-members-sold-out"
        role="status"
      >
        <span className="exam-landing-pill" style={{ background: "#FEE2E2", color: "#991B1B" }}>
          Sold out
        </span>
        <h3 className="mt-3 text-base font-bold text-[#14532D]">{name}</h3>
        <p className="mt-1 text-sm text-slate-600">
          All {maxAllocations} Founding Members allocations have been claimed by eligible
          purchasers. Standard plans and credit packs remain available.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link href={EXAM_PRACTICE_DESTINATIONS.credits} className="exam-landing-cta">
            Open credits / plans
          </Link>
          <Link
            href={EXAM_PRACTICE_DESTINATIONS.pricing}
            className="exam-landing-cta exam-landing-cta--ghost"
          >
            View pricing
          </Link>
        </div>
      </article>
    );
  }

  return (
    <article
      className="exam-landing-card exam-landing-card--gold"
      data-testid="founding-members-offer"
      aria-labelledby="founding-members-heading"
    >
      <span className="exam-landing-ribbon" aria-hidden>
        Founding
      </span>
      <div className="pr-10">
        <span className="exam-landing-pill">
          Limited · first {maxAllocations} successful purchases
        </span>
        <h3
          id="founding-members-heading"
          className="mt-3 text-lg font-bold text-[#14532D]"
        >
          {name}
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          One-time Paystack payment in GHS. Seats are counted only after the server verifies a
          successful charge — no fake timers or invented scarcity.
        </p>
        <p className="mt-3 text-3xl font-extrabold text-[#14532D]">
          GHS {priceGhs.toFixed(2)}
          <span className="ml-2 text-sm font-semibold text-slate-600">one-time</span>
        </p>
        <p className="mt-1 text-sm font-semibold text-[#166534]" data-testid="founding-members-remaining">
          {remaining} of {maxAllocations} allocations remaining
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Access duration: <strong>{accessDurationLabel}</strong> from verified payment (same
          period length as existing paid plans).
        </p>
        {!liveCheckoutEnabled ? (
          <p
            className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900"
            data-testid="founding-members-not-live"
            role="status"
          >
            Checkout is prepared but not live until an administrator sets{" "}
            <code className="rounded bg-amber-100 px-1">FOUNDING_MEMBERS_OFFER_LIVE=true</code>{" "}
            after approving the {accessDurationLabel} access duration.
          </p>
        ) : null}
      </div>

      <div className="mt-4 space-y-2 rounded-xl bg-[#FFFBEB] px-3 py-3 text-sm text-[#78350F]">
        <p className="font-semibold">What this premium package includes</p>
        <ul className="list-inside list-disc space-y-1 text-[#92400E]">
          {FOUNDING_MEMBERS_SCOPE_BULLETS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="pt-1 font-semibold text-[#78350F]">Honest limits</p>
        <ul className="list-inside list-disc space-y-1 text-[#92400E]">
          {FOUNDING_MEMBERS_NOT_INCLUDED.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {signedIn ? (
          <button
            type="button"
            className="exam-landing-cta"
            data-testid="founding-members-unlock-btn"
            disabled={
              phase === "starting" ||
              phase === "redirecting" ||
              !liveCheckoutEnabled
            }
            onClick={() => void startCheckout()}
          >
            {phase === "starting" || phase === "redirecting"
              ? "Starting Paystack…"
              : `Unlock Premium for GHS ${priceGhs}`}
          </button>
        ) : (
          <Link
            href="/chat/login/"
            rel="nofollow"
            className="exam-landing-cta"
            data-testid="founding-members-sign-in"
            onClick={() => rememberPostLoginPath("/gigalearn/exam/")}
          >
            Sign in to unlock Premium for GHS {priceGhs}
          </Link>
        )}
        <Link
          href={EXAM_PRACTICE_DESTINATIONS.pricing}
          className="exam-landing-cta exam-landing-cta--ghost"
        >
          Compare standard plans
        </Link>
      </div>

      {error ? (
        <p
          className="mt-3 text-sm text-rose-700"
          role="alert"
          data-testid="founding-members-error"
        >
          {error}
        </p>
      ) : null}
    </article>
  );
}
