"use client";

import {
  creditPromptMessage,
  type CreditPromptVariant,
} from "@/lib/billing/creditPrompts";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Coins, Sparkles, X } from "lucide-react";
import Link from "next/link";

interface CreditPromptBannerProps {
  variant: CreditPromptVariant;
  credits?: number | null;
  creditCost?: number;
  message?: string;
  subscriptionActive?: boolean;
  onDismiss?: () => void;
  className?: string;
  compact?: boolean;
}

export function CreditPromptBanner({
  variant,
  credits,
  creditCost,
  message,
  subscriptionActive = false,
  onDismiss,
  className,
  compact,
}: CreditPromptBannerProps) {
  const copy =
    message ??
    creditPromptMessage({
      variant,
      credits,
      creditCost,
      errorMessage: message,
    });

  const primaryHref = subscriptionActive
    ? siteConfig.links.credits
    : siteConfig.links.subscribe;
  const primaryLabel = subscriptionActive ? "Buy credits" : "Subscribe";
  const PrimaryIcon = subscriptionActive ? Coins : Sparkles;

  const secondaryHref = subscriptionActive
    ? siteConfig.links.pricing
    : siteConfig.links.credits;
  const secondaryLabel = subscriptionActive ? "View plans" : "Buy credits";

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 border border-amber-200/80 bg-amber-50/95 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100",
        compact
          ? "rounded-lg px-3 py-2 text-xs"
          : "rounded-xl px-3 py-2.5 text-sm sm:px-4",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <p className={cn("leading-snug", compact && "text-xs")}>{copy}</p>
        <div
          className={cn(
            "mt-2 flex flex-wrap items-center gap-2",
            compact && "mt-1.5 gap-1.5"
          )}
        >
          <Link
            href={primaryHref}
            className={cn(
              "inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 font-semibold text-white hover:opacity-90",
              compact && "min-h-7 px-2.5 py-1 text-[11px]"
            )}
          >
            <PrimaryIcon className={cn("h-3.5 w-3.5", compact && "h-3 w-3")} aria-hidden />
            {primaryLabel}
          </Link>
          <Link
            href={secondaryHref}
            className={cn(
              "inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-amber-300/80 bg-white/80 px-3 py-1.5 font-medium text-amber-950 hover:bg-white dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100 dark:hover:bg-amber-900/40",
              compact && "min-h-7 px-2.5 py-1 text-[11px]"
            )}
          >
            {secondaryLabel}
          </Link>
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
