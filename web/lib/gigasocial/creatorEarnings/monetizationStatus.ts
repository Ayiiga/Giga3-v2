/**
 * Creator monetisation status model for the Earnings Centre.
 * Status is derived server-side; the client only renders labels.
 */

export const MONETIZATION_STATUS_IDS = [
  "not_yet_eligible",
  "eligible_to_apply",
  "application_submitted",
  "under_review",
  "monetization_approved",
  "temporarily_suspended",
  "monetization_rejected",
  "appeal_available",
] as const;

export type MonetizationStatusId = (typeof MONETIZATION_STATUS_IDS)[number];

export const MONETIZATION_STATUS_COPY: Record<
  MonetizationStatusId,
  { title: string; meaning: string }
> = {
  not_yet_eligible: {
    title: "Not yet eligible",
    meaning:
      "You have not met the published fan and account requirements to apply for creator monetisation.",
  },
  eligible_to_apply: {
    title: "Eligible to apply",
    meaning:
      "You meet the numeric fan threshold. Accept the creator rules and submit an application for review. Meeting the fan count alone does not guarantee approval.",
  },
  application_submitted: {
    title: "Application submitted",
    meaning: "We received your application. It is waiting to enter review.",
  },
  under_review: {
    title: "Under review",
    meaning:
      "Our team is checking your content originality, account standing, and policy compliance. This is not an automatic approval.",
  },
  monetization_approved: {
    title: "Monetisation approved",
    meaning:
      "You may earn from enabled sources under the current policy. Withdrawals still require balance, identity, and payment checks.",
  },
  temporarily_suspended: {
    title: "Temporarily suspended",
    meaning:
      "Monetisation is paused while we investigate a policy or payment issue. Existing approved balances are not confiscated without a documented decision.",
  },
  monetization_rejected: {
    title: "Monetisation rejected",
    meaning:
      "Your application did not meet current policy requirements. See the rejection reason for next steps.",
  },
  appeal_available: {
    title: "Appeal available",
    meaning:
      "You may submit one appeal with new information. Appeals are reviewed by a human; outcomes are audited.",
  },
};

export type ApplicationRecord = {
  status?: string | null;
  submittedAt?: number | null;
  reviewedAt?: number | null;
  rejectionReason?: string | null;
  appealSubmittedAt?: number | null;
  suspendedAt?: number | null;
};

/**
 * Derive UI status from server eligibility + application record.
 * Never trust a client-supplied status string alone.
 */
export function deriveMonetizationStatus(args: {
  fanEligible: boolean;
  accepted: boolean;
  application?: ApplicationRecord | null;
}): MonetizationStatusId {
  const app = args.application;
  const appStatus = app?.status ?? null;

  if (appStatus === "suspended" || app?.suspendedAt) {
    return "temporarily_suspended";
  }
  if (appStatus === "appeal_available") {
    return "appeal_available";
  }
  if (appStatus === "rejected") {
    return app?.appealSubmittedAt ? "under_review" : "monetization_rejected";
  }
  if (appStatus === "under_review") {
    return "under_review";
  }
  if (appStatus === "submitted") {
    return "application_submitted";
  }
  if (appStatus === "approved" || (args.accepted && args.fanEligible)) {
    // Accepted terms under current policy with fans still met → approved path.
    if (args.accepted && args.fanEligible) return "monetization_approved";
  }
  if (args.fanEligible) {
    return "eligible_to_apply";
  }
  return "not_yet_eligible";
}

export function eligibilityChecklist(args: {
  fanCount: number;
  fansRequired: number;
  accepted: boolean;
  accountStandingOk: boolean;
  hasSocialProfile: boolean;
}): Array<{ id: string; label: string; met: boolean }> {
  return [
    {
      id: "profile",
      label: "GigaSocial creator profile created",
      met: args.hasSocialProfile,
    },
    {
      id: "fans",
      label: `At least ${args.fansRequired} genuine fans`,
      met: args.fanCount >= args.fansRequired,
    },
    {
      id: "standing",
      label: "Account in good standing (no unresolved disqualifying violations)",
      met: args.accountStandingOk,
    },
    {
      id: "consent",
      label: "Accepted current creator monetisation rules",
      met: args.accepted,
    },
  ];
}
