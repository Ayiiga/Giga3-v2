"use client";

import { useInterfaceLanguage } from "@/components/providers/InterfaceLanguageProvider";

export function InterfaceLanguageSettings() {
  const { language, preference, setPreference } = useInterfaceLanguage();
  const french = language === "fr";

  return (
    <section lang={language} className="rounded-2xl border border-border bg-card p-4">
      <label htmlFor="interface-language" className="text-sm font-semibold text-foreground">
        {french ? "Langue de l’application" : "App language"}
      </label>
      <p id="interface-language-help" className="mt-1 text-xs text-muted">
        {french
          ? "Choisissez la langue des menus. Certaines pages sont encore en anglais."
          : "Choose the language for menus. Some pages are still in English."}
      </p>
      <select
        id="interface-language"
        aria-describedby="interface-language-help"
        className="mt-3 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground"
        value={preference}
        onChange={(event) => {
          const value = event.target.value;
          if (value === "system" || value === "en" || value === "fr") setPreference(value);
        }}
      >
        <option value="system">{french ? "Langue de l’appareil" : "Device language"}</option>
        <option value="en" lang="en">English</option>
        <option value="fr" lang="fr">Français</option>
      </select>
    </section>
  );
}
