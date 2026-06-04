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
        mode === "live" &&
          "bg-emerald-500/15 text-emerald-200 ring-emerald-500/40",
        mode === "test" && "bg-amber-500/15 text-amber-200 ring-amber-500/40",
        mode !== "live" &&
          mode !== "test" &&
          "bg-white/10 text-muted ring-border",
        className
      )}
    >
      {label}
      {inlineEnabled ? " · secure checkout" : ""}
    </span>
  );
}
