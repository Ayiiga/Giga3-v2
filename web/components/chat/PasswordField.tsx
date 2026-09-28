"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder?: string;
  minLength?: number;
  /** Accessible name for the toggle. Confirm fields pass "confirm password". */
  toggleName?: string;
};

export function passwordVisibilityLabel(visible: boolean, name = "password"): string {
  return visible ? `Hide ${name}` : `Show ${name}`;
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  minLength = 8,
  toggleName = "password",
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const toggleId = useId();
  const toggleLabel = passwordVisibilityLabel(visible, toggleName);

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          required
          autoComplete={autoComplete}
          minLength={minLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="input-surface"
          style={{ paddingRight: "3rem" }}
          placeholder={placeholder}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
        <button
          id={toggleId}
          type="button"
          className="absolute inset-y-1 right-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted hover:text-foreground"
          aria-label={toggleLabel}
          aria-pressed={visible}
          aria-controls={id}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
        </button>
      </div>
    </div>
  );
}
