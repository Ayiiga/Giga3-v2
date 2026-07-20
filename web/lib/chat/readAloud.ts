/** Strip markdown and URLs for text-to-speech. */
export function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_~\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

let activeUtterance: SpeechSynthesisUtterance | null = null;

export function stopReadAloud(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  activeUtterance = null;
}

export function isReadAloudSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function isReadAloudActive(): boolean {
  return typeof window !== "undefined" && window.speechSynthesis?.speaking === true;
}

/** Speak plain text; returns false when unsupported or empty. */
export function readAloud(text: string, lang = "en"): boolean {
  if (!isReadAloudSupported()) return false;
  const plain = stripMarkdownForSpeech(text);
  if (!plain) return false;

  stopReadAloud();
  const utterance = new SpeechSynthesisUtterance(plain);
  utterance.lang = lang;
  utterance.rate = 1;
  utterance.onend = () => {
    if (activeUtterance === utterance) activeUtterance = null;
  };
  activeUtterance = utterance;
  window.speechSynthesis.speak(utterance);
  return true;
}
