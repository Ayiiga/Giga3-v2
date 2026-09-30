"use client";

import {
  PAY_METHODS,
  type PayMethod,
} from "@/lib/billing/paystackPacks";
import { cn } from "@/lib/utils";

interface PayMethodPickerProps {
  value: PayMethod;
  onChange: (method: PayMethod) => void;
  disabled?: boolean;
  className?: string;
}

/** Shared Paystack method selector — MoMo via Paystack, plus card and bank where configured. */
export function PayMethodPicker({
  value,
  onChange,
  disabled,
  className,
}: PayMethodPickerProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium text-foreground">Pay with MTN MoMo via Paystack</p>
      <p className="text-xs text-muted">
        Telecel/Vodafone Cash, AirtelTigo Money, cards, and bank transfer are available through
        Paystack when your network supports them.
      </p>
      <div className="flex flex-wrap gap-2">
        {PAY_METHODS.map((method) => (
          <button
            key={method.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(method.id)}
            className={cn(
              "min-h-11 rounded-full border px-4 py-2 text-left text-sm",
              value === method.id
                ? "border-accent bg-accent/10 font-semibold text-foreground"
                : "border-border bg-white text-foreground hover:border-accent/30"
            )}
          >
            <span className="block">{method.label}</span>
            <span className="block text-[11px] font-normal text-muted">{method.detail}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
