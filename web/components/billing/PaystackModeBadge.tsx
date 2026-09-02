"use client";

import type { PaystackClientMode } from "@/lib/payments/paystackConfig";
import { cn } from "@/lib/utils";

interface PaystackModeBadgeProps {
  mode: PaystackClientMode | null;
  inlineEnabled?: boolean;
  className?: string;
}

export function PaystackModeBadge({
  mode,
  inlineEnabled,
  className,
}: PaystackModeBadgeProps) {
  if (!mode && !inlineEnabled) return null;

  const label =
    mode === "live"
      ? "Paystack live"
      : mode === "test"
        ? "Paystack test"
        : "Paystack";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
        // Light backgrounds need the 700/800 shades for AA contrast; dark mode keeps the pale text.
        mode === "live" &&
          "bg-emerald-50 text-emerald-800 ring-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/40",
        mode === "test" &&
          "bg-amber-50 text-amber-800 ring-amber-300 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/40",
        mode !== "live" &&
          mode !== "test" &&
          "bg-slate-50 text-slate-700 ring-border dark:bg-white/10 dark:text-muted",
        className
      )}
    >
      {label}
      {inlineEnabled ? " · secure checkout" : ""}
    </span>
  );
}
