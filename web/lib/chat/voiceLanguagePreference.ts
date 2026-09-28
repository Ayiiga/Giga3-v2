const STORAGE_KEY = "giga3_voice_language_id";
const DEFAULT_VOICE_ID = "english-british";

export const VOICE_LANGUAGE_EVENT = "giga3:voice-language";

export function readVoiceLanguageId(): string {
  if (typeof window === "undefined") return DEFAULT_VOICE_ID;
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_VOICE_ID;
  } catch {
    return DEFAULT_VOICE_ID;
  }
}

export function writeVoiceLanguageId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new CustomEvent(VOICE_LANGUAGE_EVENT, { detail: id }));
  } catch {
    /* ignore quota / private mode */
  }
}

export function subscribeVoiceLanguageId(
  listener: (voiceId: string) => void
): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<string>).detail;
    if (typeof detail === "string") listener(detail);
  };
  window.addEventListener(VOICE_LANGUAGE_EVENT, handler);
  return () => window.removeEventListener(VOICE_LANGUAGE_EVENT, handler);
}
