/**
 * Phase 2 curriculum-aware flashcards.
 * Generated markdown → Front/Back cards → study session with shuffle +
 * mastered tracking (per deck, on-device).
 */

export interface Flashcard {
  id: string;
  front: string;
  back: string;
}

const MASTERED_KEY = "giga3_gigalearn_flashcards_mastered";

function clean(text: string): string {
  return text.replace(/\*\*/g, "").trim();
}

/** Lenient parser for AI flashcard lists (numbered Front:/Back: pairs). */
export function parseFlashcards(content: string): Flashcard[] {
  const cards: Flashcard[] = [];
  const lines = content.split("\n");
  let current: { front?: string; back?: string } | null = null;

  const push = () => {
    if (current?.front && current?.back) {
      cards.push({
        id: `fc_${cards.length + 1}`,
        front: current.front,
        back: current.back,
      });
    }
    current = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const frontMatch = trimmed.match(/^(?:\d+[\).:\-—]\s*)?Front\s*[:=]\s*(.+)/i);
    if (frontMatch) {
      push();
      current = { front: clean(frontMatch[1]) };
      continue;
    }
    const backMatch = trimmed.match(/^Back\s*[:=]\s*(.+)/i);
    if (backMatch && current) {
      current.back = clean(backMatch[1]);
      continue;
    }
    // "Q: ... / A: ..." fallback pairs.
    const qMatch = trimmed.match(/^(?:\d+[\).:\-—]\s*)?(?:Q|Question)\s*[:=]\s*(.+)/i);
    if (qMatch) {
      push();
      current = { front: clean(qMatch[1]) };
      continue;
    }
    const aMatch = trimmed.match(/^(?:A|Answer)\s*[:=]\s*(.+)/i);
    if (aMatch && current && !current.back) {
      current.back = clean(aMatch[1]);
    }
  }
  push();
  return cards;
}

export function deckIdFor(topic: string, subjectId: string, levelId: string): string {
  return `${subjectId}::${levelId}::${topic}`.toLowerCase().slice(0, 160) || "deck";
}

function readMastered(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(MASTERED_KEY) ?? "{}") as Record<string, string[]>;
  } catch {
    return {};
  }
}

export function masteredForDeck(deckId: string): string[] {
  return readMastered()[deckId] ?? [];
}

export function markCardMastered(deckId: string, cardId: string): string[] {
  const all = readMastered();
  const next = Array.from(new Set([...(all[deckId] ?? []), cardId]));
  all[deckId] = next;
  try {
    localStorage.setItem(MASTERED_KEY, JSON.stringify(all));
  } catch {
    /* quota */
  }
  return next;
}

export function unmarkCardMastered(deckId: string, cardId: string): string[] {
  const all = readMastered();
  all[deckId] = (all[deckId] ?? []).filter((id) => id !== cardId);
  try {
    localStorage.setItem(MASTERED_KEY, JSON.stringify(all));
  } catch {
    /* quota */
  }
  return all[deckId] ?? [];
}

export function shuffleCards<T>(cards: T[]): T[] {
  const next = [...cards];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}
