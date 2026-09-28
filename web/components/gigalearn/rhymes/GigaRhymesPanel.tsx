"use client";

import { RhymePlayer } from "@/components/gigalearn/rhymes/RhymePlayer";
import { useBackToClose } from "@/hooks/useBackToClose";
import { GIGA_RHYMES, RHYME_CATEGORIES, getRhyme, nextRhyme } from "@/lib/gigalearn/rhymes/library";
import { markRhymePractised, readPractisedRhymes } from "@/lib/gigalearn/rhymes/progress";
import { ORIGINAL_RHYME_LABEL, type RhymeCategoryId } from "@/lib/gigalearn/rhymes/types";
import { cn } from "@/lib/utils";
import { Check, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type GigaRhymesPanelProps = {
  onCreateRhyme?: () => void;
};

export function GigaRhymesPanel({ onCreateRhyme }: GigaRhymesPanelProps) {
  const [category, setCategory] = useState<RhymeCategoryId | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [practised, setPractised] = useState<string[]>([]);
  const lastOpenerRef = useRef<string | null>(null);
  useBackToClose(openId != null, () => setOpenId(null));

  useEffect(() => {
    setPractised(readPractisedRhymes());
  }, []);

  useEffect(() => {
    if (openId || !lastOpenerRef.current) return;
    document.getElementById(`rhyme-card-${lastOpenerRef.current}`)?.focus();
  }, [openId]);

  const visible = useMemo(
    () => (category === "all" ? GIGA_RHYMES : GIGA_RHYMES.filter((rhyme) => rhyme.category === category)),
    [category]
  );

  const onPractised = useCallback((id: string) => {
    setPractised((current) => (current.includes(id) ? current : markRhymePractised(id)));
  }, []);

  const open = openId ? getRhyme(openId) : undefined;
  if (open) {
    const next = nextRhyme(open.id);
    return (
      <RhymePlayer
        rhyme={open}
        onBack={() => setOpenId(null)}
        onNext={next ? () => setOpenId(next.id) : undefined}
        onPractised={onPractised}
      />
    );
  }

  const practisedCount = GIGA_RHYMES.filter((rhyme) => practised.includes(rhyme.id)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            {GIGA_RHYMES.length} rhymes · {RHYME_CATEGORIES.length} categories · {ORIGINAL_RHYME_LABEL}
          </p>
          <div className="mt-1 flex items-center gap-2" aria-label="Rhyme progress">
            <div
              className="h-2 w-40 overflow-hidden rounded-full bg-accent/10"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={GIGA_RHYMES.length}
              aria-valuenow={practisedCount}
              aria-label="Rhymes practised"
            >
              <div
                className="h-full bg-accent"
                style={{ width: `${(practisedCount / GIGA_RHYMES.length) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted">
              {practisedCount} / {GIGA_RHYMES.length} practised
            </span>
          </div>
        </div>
        {onCreateRhyme ? (
          <button
            type="button"
            onClick={onCreateRhyme}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Create a new rhyme
          </button>
        ) : null}
      </div>

      <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1" role="group" aria-label="Rhyme categories">
        {[{ id: "all" as const, label: "All", emoji: "✨" }, ...RHYME_CATEGORIES].map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={category === item.id}
            onClick={() => setCategory(item.id)}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm",
              category === item.id
                ? "border-accent/40 bg-accent/10 font-semibold text-foreground"
                : "border-border text-muted hover:border-accent/25"
            )}
          >
            <span aria-hidden>{item.emoji}</span>
            {item.label}
          </button>
        ))}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((rhyme) => {
          const done = practised.includes(rhyme.id);
          const cat = RHYME_CATEGORIES.find((c) => c.id === rhyme.category);
          return (
            <li key={rhyme.id}>
              <button
                id={`rhyme-card-${rhyme.id}`}
                type="button"
                onClick={() => {
                  lastOpenerRef.current = rhyme.id;
                  setOpenId(rhyme.id);
                }}
                className="saas-card flex min-h-11 w-full items-start gap-3 rounded-2xl border border-border p-4 text-left hover:border-accent/30"
              >
                <span className="text-4xl leading-none" aria-hidden>
                  {rhyme.illustration.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-foreground">{rhyme.title}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {cat?.label} · {rhyme.ageRange} · {rhyme.language}
                  </span>
                  <span className="mt-1 block text-xs text-foreground/80">{rhyme.learningObjective}</span>
                </span>
                {done ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                    <Check className="h-3 w-3" aria-hidden />
                    Practised
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
