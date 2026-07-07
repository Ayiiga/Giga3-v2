"use client";

import Link from "next/link";
import { X } from "lucide-react";

export function ChatErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  const lowCredits =
    typeof message === "string" &&
    (message.toLowerCase().includes("insufficient credits") ||
      message.toLowerCase().includes("credits"));

  return (
    <div
      role="alert"
      className="mx-3 mt-2 flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/95 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100 sm:mx-4"
    >
      <div className="min-w-0 flex-1">
        <p className="leading-snug">{typeof message === "string" ? message : "Something went wrong."}</p>
        {lowCredits && (
          <p className="mt-2 text-xs">
            <Link href="/pricing" className="font-medium text-accent underline">
              View plans
            </Link>
            {" · "}
            <Link href="/credits" className="font-medium text-accent underline">
              Buy credits
            </Link>
          </p>
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
