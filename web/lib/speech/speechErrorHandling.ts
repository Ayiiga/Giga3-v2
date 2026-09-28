export function speechErrorCode(event: SpeechSynthesisErrorEvent): string {
  const code = event?.error;
  return typeof code === "string" ? code : "";
}

export function isBenignSpeechError(code: string): boolean {
  return code === "interrupted" || code === "canceled" || code === "cancelled";
}

export function canRetrySpeechWithoutVoice(code: string): boolean {
  return (
    code === "synthesis-failed" ||
    code === "network" ||
    code === "language-unavailable" ||
    code === "voice-unavailable" ||
    code === "audio-busy"
  );
}
