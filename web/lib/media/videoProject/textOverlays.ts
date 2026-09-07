import type { TextOverlayLayer } from "@/lib/media/videoProject/types";
import { newOverlayId } from "@/lib/media/videoProject/types";

/** Common English words for basic spell-check — not exhaustive. */
const COMMON_WORDS = new Set([
  "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "of", "with", "from",
  "ghana", "accra", "africa", "ai", "giga3", "gigasocial", "video", "future", "2050",
]);

export type TextSpellIssue = {
  overlayId: string;
  word: string;
  suggestion?: string;
};

export function createTextOverlay(
  partial: Pick<TextOverlayLayer, "text" | "kind"> & Partial<TextOverlayLayer>
): TextOverlayLayer {
  return {
    id: newOverlayId(),
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: 48,
    fontWeight: 700,
    align: "center",
    position: partial.kind === "lower_third" ? "lower_third" : "bottom",
    animation: "fade_in",
    shadow: true,
    outline: true,
    background: partial.kind === "lower_third" || partial.kind === "caption",
    opacity: 1,
    letterSpacing: 0,
    locked: false,
    ...partial,
    text: partial.text,
    kind: partial.kind,
  };
}

/** Preserve user text exactly — only trim outer whitespace. */
export function normalizeOverlayText(text: string): string {
  return text.replace(/\r\n/g, "\n").trim();
}

export function validateOverlayTextExact(original: string, candidate: string): boolean {
  return normalizeOverlayText(original) === normalizeOverlayText(candidate);
}

function tokenizeForSpellCheck(text: string): string[] {
  return text
    .split(/[\s\n]+/)
    .map((w) => w.replace(/^[^a-zA-Z0-9#@]+|[^a-zA-Z0-9#@]+$/g, ""))
    .filter((w) => w.length >= 3 && /[a-zA-Z]/.test(w));
}

/** Lightweight heuristic spell check — flags unknown tokens, not a perfect dictionary. */
export function findSpellingIssues(overlays: TextOverlayLayer[]): TextSpellIssue[] {
  const issues: TextSpellIssue[] = [];
  for (const layer of overlays) {
    if (layer.locked) continue;
    for (const word of tokenizeForSpellCheck(layer.text)) {
      const lower = word.toLowerCase();
      if (COMMON_WORDS.has(lower)) continue;
      if (/^\d+$/.test(word)) continue;
      if (/^[A-Z0-9#@]{2,}$/.test(word)) continue;
      if (word.length <= 4) continue;
      issues.push({ overlayId: layer.id, word });
    }
  }
  return issues;
}

export function extractQuotedTextFromPrompt(prompt: string): string[] {
  const matches = [...prompt.matchAll(/"([^"]{2,})"|'([^']{2,})'/g)];
  return matches.map((m) => (m[1] ?? m[2] ?? "").trim()).filter(Boolean);
}

/** Suggest title overlays from quoted phrases in the master prompt. */
export function suggestedTitleOverlaysFromPrompt(prompt: string): TextOverlayLayer[] {
  return extractQuotedTextFromPrompt(prompt).map((text) =>
    createTextOverlay({ kind: "title", text, position: "center", fontSize: 56 })
  );
}
