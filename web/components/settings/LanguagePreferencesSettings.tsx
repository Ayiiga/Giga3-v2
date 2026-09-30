"use client";

import {
  RESPONSE_LANGUAGE_OPTIONS,
  readResponseLanguage,
  writeResponseLanguage,
  type ResponseLanguageId,
} from "@/lib/i18n/languagePreferences";
import { useEffect, useState } from "react";

export function LanguagePreferencesSettings() {
  const [language, setLanguage] = useState<ResponseLanguageId>("english");

  useEffect(() => {
    setLanguage(readResponseLanguage());
  }, []);

  function select(next: ResponseLanguageId) {
    setLanguage(next);
    writeResponseLanguage(next);
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">Response language</h2>
      <p className="mt-1 text-xs text-muted">
        Prefer Twi or Ewe via Khaya read-aloud where configured. Full UI translation is not
        automatic.
      </p>
      <div className="mt-3 space-y-2">
        {RESPONSE_LANGUAGE_OPTIONS.map((option) => (
          <label
            key={option.id}
            className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border px-3 py-2.5 has-[:checked]:border-accent/40 has-[:checked]:bg-accent/5"
          >
            <input
              type="radio"
              name="response-language"
              className="mt-1"
              checked={language === option.id}
              onChange={() => select(option.id)}
            />
            <span>
              <span className="block text-sm font-medium text-foreground">{option.label}</span>
              <span className="block text-xs text-muted">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
