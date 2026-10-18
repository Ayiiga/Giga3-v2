export type ResponseDetailId = "quick" | "detailed" | "expert";

export const RESPONSE_DETAIL_OPTIONS: {
  id: ResponseDetailId;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    id: "quick",
    label: "Quick answer",
    shortLabel: "Quick",
    description: "Direct answer with minimal explanation",
  },
  {
    id: "detailed",
    label: "Detailed",
    shortLabel: "Detailed",
    description: "Step-by-step explanation with examples",
  },
  {
    id: "expert",
    label: "Expert",
    shortLabel: "Expert",
    description: "Structured analysis with assumptions and limits",
  },
];

const STORAGE_KEY = "giga3_response_detail";

export function isValidResponseDetail(id: string): id is ResponseDetailId {
  return RESPONSE_DETAIL_OPTIONS.some((o) => o.id === id);
}

export function loadResponseDetailPreference(): ResponseDetailId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw && isValidResponseDetail(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function saveResponseDetailPreference(id: ResponseDetailId | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!id) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore quota / private mode */
  }
}
