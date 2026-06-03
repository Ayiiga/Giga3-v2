import { cn } from "@/lib/utils";

export interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  /** Optimistic / in-flight user message */
  pending?: boolean;
}

export function MessageBubble({ role, content, pending }: MessageBubbleProps) {
  const isUser = role === "user";
  const safeContent =
    typeof content === "string" && content.length > 0
      ? content
      : "(Empty message)";

  return (
    <div
      className={cn(
        "flex w-full animate-slide-up",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[92%] rounded-2xl border px-5 py-4 text-base font-medium leading-relaxed shadow-md sm:max-w-[80%] sm:text-lg",
          isUser
            ? "rounded-br-md border-violet-300/80 bg-white text-black shadow-violet-500/15"
            : "rounded-bl-md border-zinc-200 bg-zinc-50 text-black shadow-black/10",
          pending && "ring-2 ring-violet-400/50"
        )}
      >
        <p className="whitespace-pre-wrap break-words text-black">{safeContent}</p>
        {pending && (
          <p className="mt-2 text-sm font-normal text-zinc-600" aria-live="polite">
            Sending…
          </p>
        )}
      </div>
    </div>
  );
}
