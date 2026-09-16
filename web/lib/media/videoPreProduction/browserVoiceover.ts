import { stripMarkdownForSpeech } from "@/lib/chat/readAloud";

export type BrowserVoiceOption = {
  uri: string;
  name: string;
  lang: string;
  localService: boolean;
};

let activeUtterance: SpeechSynthesisUtterance | null = null;

export function isBrowserVoiceoverSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function listBrowserVoices(): BrowserVoiceOption[] {
  if (!isBrowserVoiceoverSupported()) return [];
  return window.speechSynthesis.getVoices().map((voice) => ({
    uri: voice.voiceURI,
    name: voice.name,
    lang: voice.lang,
    localService: voice.localService,
  }));
}

export function stopVoiceoverPreview(): void {
  if (!isBrowserVoiceoverSupported()) return;
  window.speechSynthesis.cancel();
  activeUtterance = null;
}

export function isVoiceoverPreviewPlaying(): boolean {
  return isBrowserVoiceoverSupported() && window.speechSynthesis.speaking;
}

export function playVoiceoverPreview(args: {
  text: string;
  voiceUri?: string;
  lang?: string;
  rate?: number;
  pitch?: number;
  onEnd?: () => void;
  onError?: (message: string) => void;
}): boolean {
  if (!isBrowserVoiceoverSupported()) {
    args.onError?.("Voice preview is not supported in this browser.");
    return false;
  }
  const plain = stripMarkdownForSpeech(args.text);
  if (!plain) {
    args.onError?.("Add script text to preview voiceover.");
    return false;
  }

  stopVoiceoverPreview();
  const utterance = new SpeechSynthesisUtterance(plain);
  utterance.lang = args.lang || "en";
  utterance.rate = args.rate ?? 1;
  utterance.pitch = args.pitch ?? 1;

  const voices = window.speechSynthesis.getVoices();
  const match = args.voiceUri
    ? voices.find((v) => v.voiceURI === args.voiceUri)
    : voices.find((v) => v.lang.startsWith("en")) ?? voices[0];
  if (match) utterance.voice = match;

  utterance.onend = () => {
    if (activeUtterance === utterance) activeUtterance = null;
    args.onEnd?.();
  };
  utterance.onerror = () => {
    activeUtterance = null;
    args.onError?.("Voice preview could not play. Try again or pick another voice.");
  };

  activeUtterance = utterance;
  window.speechSynthesis.speak(utterance);
  return true;
}
