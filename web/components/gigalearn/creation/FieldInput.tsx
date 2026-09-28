"use client";

import type { FieldValue, IntakeField } from "@/lib/gigalearn/creation/types";
import { cn } from "@/lib/utils";

type FieldInputProps = {
  field: IntakeField;
  value: FieldValue | undefined;
  onChange: (value: FieldValue) => void;
  inputId: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
};

const INPUT_CLASS =
  "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-base text-foreground outline-none ring-accent/20 focus:ring-2";

export function FieldInput({ field, value, onChange, inputId, autoFocus, onSubmit }: FieldInputProps) {
  const text = Array.isArray(value) ? value.join(", ") : value ?? "";

  if (field.kind === "choice" || field.kind === "multichoice") {
    const selected = Array.isArray(value) ? value : value ? [value] : [];
    const options = field.options ?? [];
    const custom = selected.filter((entry) => !options.includes(entry));
    const multi = field.kind === "multichoice";

    const toggle = (option: string) => {
      if (!multi) {
        onChange(option);
        return;
      }
      onChange(selected.includes(option) ? selected.filter((s) => s !== option) : [...selected, option]);
    };

    return (
      <div className="space-y-2">
        <div
          role={multi ? "group" : "radiogroup"}
          aria-labelledby={`${inputId}-label`}
          className="flex flex-wrap gap-2"
        >
          {options.map((option, index) => {
            const active = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                role={multi ? undefined : "radio"}
                aria-checked={multi ? undefined : active}
                aria-pressed={multi ? active : undefined}
                autoFocus={autoFocus && index === 0}
                onClick={() => toggle(option)}
                className={cn(
                  "min-h-11 rounded-full border px-3 text-sm",
                  active
                    ? "border-accent bg-accent text-accent-foreground font-semibold"
                    : "border-border bg-white text-foreground hover:border-accent/40"
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
        {field.allowCustom ? (
          <input
            id={`${inputId}-custom`}
            aria-label={`${field.label} — other`}
            placeholder={multi ? "Other (optional)" : "Or type your own"}
            value={custom.join(", ")}
            onChange={(event) => {
              const typed = event.target.value;
              const chosen = selected.filter((entry) => options.includes(entry));
              if (multi) onChange(typed.trim() ? [...chosen, typed] : chosen);
              else onChange(typed);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && onSubmit) {
                event.preventDefault();
                onSubmit();
              }
            }}
            className={INPUT_CLASS}
          />
        ) : null}
      </div>
    );
  }

  if (field.kind === "longtext") {
    return (
      <textarea
        id={inputId}
        value={text}
        autoFocus={autoFocus}
        rows={4}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(INPUT_CLASS, "max-h-60")}
      />
    );
  }

  return (
    <input
      id={inputId}
      type={field.kind === "number" ? "number" : "text"}
      inputMode={field.kind === "number" ? "numeric" : undefined}
      min={field.min}
      max={field.max}
      value={text}
      autoFocus={autoFocus}
      placeholder={field.placeholder}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter" && onSubmit) {
          event.preventDefault();
          onSubmit();
        }
      }}
      className={INPUT_CLASS}
    />
  );
}
