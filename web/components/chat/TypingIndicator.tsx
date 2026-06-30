"use client";

/** Typing indicator with subtle pulse (respects reduced motion via CSS). */
export function TypingIndicator() {
  return (
    <div
      className="min-h-[24px]"
      aria-live="polite"
      aria-label="Assistant is typing"
    >
      <div className="flex items-center gap-2.5">
        <span className="inline-flex items-center gap-1" aria-hidden>
          <span className="chat-typing-dot h-1.5 w-1.5 rounded-full bg-violet-500" />
          <span className="chat-typing-dot h-1.5 w-1.5 rounded-full bg-violet-500" />
          <span className="chat-typing-dot h-1.5 w-1.5 rounded-full bg-violet-500" />
        </span>
        <span className="text-sm font-medium text-muted">Giga3 is thinking…</span>
      </div>
    </div>
  );
}
