"use client";

import { Button } from "@/components/ui/Button";
import {
  deckIdFor,
  markCardMastered,
  masteredForDeck,
  shuffleCards,
  unmarkCardMastered,
  type Flashcard,
} from "@/lib/gigalearn/flashcards";
import { cn } from "@/lib/utils";
import { Check, RotateCcw, Shuffle } from "lucide-react";
import { memo, useMemo, useState } from "react";

interface FlashcardStudyProps {
  cards: Flashcard[];
  deckId?: string;
}

export const FlashcardStudy = memo(function FlashcardStudy({ cards, deckId }: FlashcardStudyProps) {
  const [order, setOrder] = useState<Flashcard[]>(cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const resolvedDeckId = deckId ?? deckIdFor("", "", "");
  const [mastered, setMastered] = useState<string[]>(() => masteredForDeck(resolvedDeckId));

  // Reset when a new set is generated.
  const fingerprint = useMemo(() => cards.map((c) => c.id).join(","), [cards]);
  const [seen, setSeen] = useState(fingerprint);
  if (seen !== fingerprint) {
    setSeen(fingerprint);
    setOrder(cards);
    setIndex(0);
    setFlipped(false);
    setMastered(masteredForDeck(resolvedDeckId));
  }

  if (!order.length) return null;
  const card = order[Math.min(index, order.length - 1)]!;
  const isMastered = mastered.includes(card.id);

  return (
    <section className="saas-card rounded-2xl border border-border p-4" aria-labelledby="flashcard-study-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="flashcard-study-heading" className="text-sm font-semibold text-foreground">
          Study flashcards
        </h3>
        <p className="text-xs text-muted" aria-live="polite">
          Card {Math.min(index + 1, order.length)} of {order.length} · {mastered.length} mastered
        </p>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((v) => !v)}
        aria-pressed={flipped}
        aria-label={flipped ? "Show question side" : "Show answer side"}
        className="mt-3 flex min-h-44 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-accent/25 bg-accent/5 px-4 py-8 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
          {flipped ? "Back — answer" : "Front — question"}
        </span>
        <span className="text-base font-medium text-foreground">{flipped ? card.back : card.front}</span>
        <span className="text-xs text-muted">Tap to flip</span>
      </button>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="min-h-11"
          disabled={index === 0}
          onClick={() => {
            setIndex((i) => Math.max(0, i - 1));
            setFlipped(false);
          }}
        >
          Previous
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="min-h-11"
          disabled={index >= order.length - 1}
          onClick={() => {
            setIndex((i) => Math.min(order.length - 1, i + 1));
            setFlipped(false);
          }}
        >
          Next
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="min-h-11"
          onClick={() => {
            setOrder((prev) => shuffleCards(prev));
            setIndex(0);
            setFlipped(false);
          }}
        >
          <Shuffle className="h-4 w-4" aria-hidden />
          Shuffle
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isMastered ? "secondary" : undefined}
          className={cn("min-h-11", isMastered && "border-emerald-300")}
          onClick={() => {
            setMastered(isMastered ? unmarkCardMastered(resolvedDeckId, card.id) : markCardMastered(resolvedDeckId, card.id));
          }}
          aria-pressed={isMastered}
        >
          {isMastered ? <RotateCcw className="h-4 w-4" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
          {isMastered ? "Mastered — undo" : "Mark as mastered"}
        </Button>
      </div>
    </section>
  );
});
