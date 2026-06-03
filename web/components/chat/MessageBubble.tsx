import { cn } from "@/lib/utils";

export interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
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
          "max-w-[92%] rounded-2xl px-5 py-4 text-base leading-relaxed sm:max-w-[80%] sm:text-lg",
          isUser
            ? "rounded-br-md bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25"
            : "rounded-bl-md border border-border/80 bg-card/90 text-foreground shadow-md backdrop-blur-sm"
        )}
      >
        <p className="whitespace-pre-wrap break-words">{safeContent}</p>
      </div>
    </div>
  );
}
