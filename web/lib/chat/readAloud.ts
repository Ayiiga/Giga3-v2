import {
  isGigaVoiceSpeaking,
  isGigaVoiceSupported,
  speakGigaVoice,
  stopGigaVoice,
  toggleGigaVoiceBlock,
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
export function readAloud(text: string, voiceId?: string, blockId?: string): boolean {
  if (!isReadAloudSupported()) return false;
  const id = voiceId ?? readVoiceLanguageId();
  const trimmed = text.trim();
  if (!trimmed) return false;

  if (blockId) {
    void toggleGigaVoiceBlock({ blockId, text: trimmed, voiceId: id });
    return true;
  }

  void speakGigaVoice({ text: trimmed, voiceId: id });
  return true;
}
