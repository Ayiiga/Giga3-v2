export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3" aria-label="Assistant is typing">
      <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:0ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:150ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:300ms]" />
    </div>
  );
}
