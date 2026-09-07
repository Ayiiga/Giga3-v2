"use client";

import {
  TEMPLATE_POLICY_OPTIONS,
  type GigaTemplatePolicy,
} from "@/lib/gigasocial/templateMeta";
import { LayoutTemplate } from "lucide-react";
import { memo } from "react";

type GigaSocialTemplatePolicyPickerProps = {
  value: GigaTemplatePolicy;
  onChange: (value: GigaTemplatePolicy) => void;
  disabled?: boolean;
  compact?: boolean;
};

export const GigaSocialTemplatePolicyPicker = memo(function GigaSocialTemplatePolicyPicker({
  value,
  onChange,
  disabled,
  compact = false,
}: GigaSocialTemplatePolicyPickerProps) {
  return (
    <label
      className={
        compact
          ? "flex min-w-0 flex-1 items-center gap-1.5 text-xs text-muted"
          : "block space-y-1 rounded-xl border border-border/80 bg-white/80 px-3 py-2.5"
      }
    >
      {!compact ? (
        <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <LayoutTemplate className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
          Template permissions
        </span>
      ) : (
        <LayoutTemplate className="h-3.5 w-3.5 shrink-0" aria-hidden />
      )}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as GigaTemplatePolicy)}
        disabled={disabled}
        aria-label="Template permissions"
        className={
          compact
            ? "min-w-0 flex-1 rounded-lg border border-border bg-white px-2 py-1 text-xs"
            : "mt-1 w-full rounded-lg border border-border bg-white px-2 py-1.5 text-xs"
        }
      >
        {TEMPLATE_POLICY_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {!compact ? (
        <p className="text-[11px] leading-snug text-muted">
          {TEMPLATE_POLICY_OPTIONS.find((o) => o.id === value)?.description}
        </p>
      ) : null}
    </label>
  );
});
