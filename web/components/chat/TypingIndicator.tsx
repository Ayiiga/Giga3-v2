"use client";

/** Static typing UI — no setInterval (avoids 1 Hz re-renders and layout churn). */
export function TypingIndicator() {
  return (
    <div
      className="min-h-[28px]"
      aria-live="polite"
      aria-label="Assistant is typing"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-cyan-500 opacity-90" />
          <span className="h-2 w-2 rounded-full bg-cyan-500 opacity-70" />
          <span className="h-2 w-2 rounded-full bg-cyan-500 opacity-50" />
        </span>
        <span className="text-sm font-medium text-zinc-700">Thinking…</span>
      </div>
      <p className="mt-2 max-h-0 overflow-hidden text-[11px] opacity-0" aria-hidden>
        Network hint reserved
      </p>
    </div>
  );
}
