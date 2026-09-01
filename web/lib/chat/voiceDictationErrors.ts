/** User-facing copy for Web Speech API errors. */
export function speechErrorMessage(error: string): string {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access was blocked. Allow microphone permission for this site and try again.";
    case "no-speech":
      return "No speech detected. Tap the mic and speak clearly.";
    case "audio-capture":
      return "No microphone found. Check your device settings.";
    case "network":
      return "Voice input needs a network connection. Check your connection and try again.";
    case "aborted":
      return "Voice input stopped.";
    default:
      return "Voice input failed. Try again or type your message.";
  }
}
