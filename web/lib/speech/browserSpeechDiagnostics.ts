export type SpeechDiagnosticEvent =
  | "voices_loaded"
  | "voices_warmup"
  | "speak_start"
  | "speak_chunk"
  | "speak_onstart"
  | "speak_onend"
  | "speak_onerror"
  | "speak_cancel"
  | "speak_retry"
  | "voice_resolved";

export function isSpeechDiagnosticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem("giga3_speech_diag") === "1") return true;
  } catch {
    /* ignore */
  }
  try {
    return new URLSearchParams(window.location.search).get("speechDiag") === "1";
  } catch {
    return false;
  }
}

export function logSpeechDiagnostic(
  event: SpeechDiagnosticEvent,
  data: Record<string, unknown>
): void {
  if (!isSpeechDiagnosticsEnabled()) return;
  console.info("[giga3-speech]", event, data);
}
