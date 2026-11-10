export type InterfaceLanguage = "en" | "fr";
export type InterfaceLanguagePreference = InterfaceLanguage | "system";

export const INTERFACE_LANGUAGE_KEY = "giga3_interface_language";

export function resolveInterfaceLanguage(
  preference: InterfaceLanguagePreference,
  deviceLanguages: readonly string[]
): InterfaceLanguage {
  if (preference !== "system") return preference;

  for (const locale of deviceLanguages) {
    const language = locale.toLowerCase().split("-")[0];
    if (language === "fr" || language === "en") return language;
  }

  return "en";
}
