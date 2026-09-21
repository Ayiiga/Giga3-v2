import {
  isGigaVoiceSpeaking,
  isGigaVoiceSupported,
  speakGigaVoice,
  stopGigaVoice,
} from "@/lib/chat/gigaVoice";
import { readVoiceLanguageId } from "@/lib/chat/voiceLanguagePreference";

export { stripMarkdownForSpeech } from "@/lib/chat/speechText";

export function stopReadAloud(): void {
  stopGigaVoice();
}

export function isReadAloudSupported(): boolean {
  return isGigaVoiceSupported();
}

export function isReadAloudActive(): boolean {
  return isGigaVoiceSpeaking();
}

/** Speak plain text with the selected Giga3 voice profile; returns false when unsupported or empty. */
export function readAloud(text: string, voiceId?: string): boolean {
  if (!isReadAloudSupported()) return false;
  const id = voiceId ?? readVoiceLanguageId();
  void speakGigaVoice({ text, voiceId: id });
  return true;
}
