"use client";

/** Static typing UI — no setInterval (avoids 1 Hz re-renders and layout churn). */
export function TypingIndicator() {
  return (
    <div
      className="min-h-[24px]"
      aria-live="polite"
      aria-label="Assistant is typing"
    >
      <div className="flex items-center gap-2.5">
        <span className="inline-flex items-center gap-1" aria-hidden>
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500 opacity-90" />
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500 opacity-65" />
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500 opacity-40" />
        </span>
        <span className="text-sm font-medium text-zinc-600">Thinking…</span>
      </div>
    </div>
  );
}
