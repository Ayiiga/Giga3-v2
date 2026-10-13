"use client";

import { CreditPromptBanner } from "@/components/billing/CreditPromptBanner";
import { isBillingRelatedError } from "@/lib/billing/creditPrompts";
import {
  ADVANCED_PERSONA_DAILY_LIMIT_MESSAGE,
  ADVANCED_PERSONA_PAID_PLAN_MESSAGE,
  isAdvancedPersonaDailyLimitMessage,
  isAdvancedPersonaEntitlementMessage,
} from "@/lib/errors/userMessage";
import { siteConfig } from "@/lib/site";
import { X } from "lucide-react";
import Link from "next/link";

export function ChatErrorBanner({
  message,
  onDismiss,
  onRetry,
  onTryStandardAi,
  subscriptionActive,
}: {
  message: string;
  onDismiss?: () => void;
  /** Only pass when retrying the same action is safe (e.g. reply regeneration). */
  onRetry?: () => void;
  /** Clears advanced persona so the user can continue with standard AI. */
  onTryStandardAi?: () => void;
  subscriptionActive?: boolean;
}) {
  const billingError = isBillingRelatedError(message);
  const personaPaid = isAdvancedPersonaEntitlementMessage(message);
  const personaDailyLimit = isAdvancedPersonaDailyLimitMessage(message);

  if (billingError) {
    return (
      <CreditPromptBanner
        variant="error"
        message={message}
        subscriptionActive={subscriptionActive}
        onDismiss={onDismiss}
        className="mx-3 mt-2 sm:mx-4"
      />
    );
  }

  if (personaPaid || personaDailyLimit) {
    const copy = personaPaid
      ? ADVANCED_PERSONA_PAID_PLAN_MESSAGE
      : ADVANCED_PERSONA_DAILY_LIMIT_MESSAGE;
    return (
      <div
        role="alert"
        className="mx-3 mt-2 flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/95 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100 sm:mx-4"
      >
        <div className="min-w-0 flex-1">
          <p className="leading-snug">{copy}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Link
              href={siteConfig.links.pricing}
              className="inline-flex min-h-8 items-center rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              View plans
            </Link>
            {onTryStandardAi ? (
              <button
                type="button"
                onClick={onTryStandardAi}
                className="inline-flex min-h-8 items-center rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-950 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100 dark:hover:bg-amber-900/60"
              >
                Try standard AI
              </button>
            ) : null}
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-md p-1 text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/50"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="mx-3 mt-2 flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/95 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100 sm:mx-4"
    >
      <div className="min-w-0 flex-1">
        <p className="leading-snug">
          {typeof message === "string" ? message : "Something went wrong."}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-950 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100 dark:hover:bg-amber-900/60"
          >
            Retry
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md p-1 text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/50"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
