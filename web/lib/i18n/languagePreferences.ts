/**
 * User-facing response language preferences (AI + voice).
 * Twi/Ewe use existing Khaya commercial paths; Pidgin is English-first until licensed.
 */

export type ResponseLanguageId = "english" | "twi" | "ewe" | "pidgin";

export const RESPONSE_LANGUAGE_OPTIONS: Array<{
  id: ResponseLanguageId;
  label: string;
  description: string;
  khayaSupported: boolean;
}> = [
  {
    id: "english",
    label: "English",
    description: "Default Giga3 responses and read-aloud.",
    khayaSupported: true,
  },
  {
    id: "twi",
    label: "Twi",
    description: "Prefer Twi in AI replies and Khaya read-aloud when available.",
    khayaSupported: true,
  },
  {
    id: "ewe",
    label: "Ewe",
    description: "Prefer Ewe in AI replies and Khaya read-aloud when available.",
    khayaSupported: true,
  },
  {
    id: "pidgin",
    label: "Ghanaian Pidgin",
    description: "English-first with Ghanaian Pidgin phrasing when the model supports it.",
    khayaSupported: false,
  },
];

const STORAGE_KEY = "giga3_response_language";

export function readResponseLanguage(): ResponseLanguageId {
  if (typeof window === "undefined") return "english";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (
      raw === "english" ||
      raw === "twi" ||
      raw === "ewe" ||
      raw === "pidgin"
    ) {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return "english";
}

export function writeResponseLanguage(id: ResponseLanguageId): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

/** Optional suffix appended to chat sends — server may ignore if unsupported. */
export function languageInstructionSuffix(id: ResponseLanguageId): string {
  switch (id) {
    case "twi":
      return "\n\n[Please respond in Twi where possible.]";
    case "ewe":
      return "\n\n[Please respond in Ewe where possible.]";
    case "pidgin":
      return "\n\n[Please respond in clear Ghanaian Pidgin where appropriate.]";
    default:
      return "";
  }
}
