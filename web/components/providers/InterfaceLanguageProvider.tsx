"use client";

import {
  INTERFACE_LANGUAGE_KEY,
  resolveInterfaceLanguage,
  type InterfaceLanguage,
  type InterfaceLanguagePreference,
} from "@/lib/i18n/interfaceLanguage";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const InterfaceLanguageContext = createContext<{
  language: InterfaceLanguage;
  preference: InterfaceLanguagePreference;
  setPreference: (preference: InterfaceLanguagePreference) => void;
}>({
  language: "en",
  preference: "system",
  setPreference: () => {},
});

export function InterfaceLanguageProvider({ children }: { children: ReactNode }) {
  const [preference, setStoredPreference] = useState<InterfaceLanguagePreference>("system");
  const [deviceLanguages, setDeviceLanguages] = useState<readonly string[]>([]);

  useEffect(() => {
    function readDeviceLanguages() {
      setDeviceLanguages(navigator.languages?.length ? navigator.languages : [navigator.language]);
    }

    try {
      const saved = localStorage.getItem(INTERFACE_LANGUAGE_KEY);
      if (saved === "en" || saved === "fr") setStoredPreference(saved);
    } catch {
      // Device language still works when storage is unavailable.
    }
    readDeviceLanguages();
    window.addEventListener("languagechange", readDeviceLanguages);
    return () => window.removeEventListener("languagechange", readDeviceLanguages);
  }, []);

  const setPreference = useCallback((next: InterfaceLanguagePreference) => {
    setStoredPreference(next);
    try {
      if (next === "system") localStorage.removeItem(INTERFACE_LANGUAGE_KEY);
      else localStorage.setItem(INTERFACE_LANGUAGE_KEY, next);
    } catch {
      // Keep the current session's selection when storage is unavailable.
    }
  }, []);

  const language = resolveInterfaceLanguage(preference, deviceLanguages);

  return (
    <InterfaceLanguageContext.Provider value={{ language, preference, setPreference }}>
      {children}
    </InterfaceLanguageContext.Provider>
  );
}

export function useInterfaceLanguage() {
  return useContext(InterfaceLanguageContext);
}
