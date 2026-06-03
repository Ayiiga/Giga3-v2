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
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[75%]",
          isUser
            ? "rounded-br-md bg-accent text-accent-foreground shadow-lg shadow-violet-500/20"
            : "rounded-bl-md border border-border bg-card text-foreground"
        )}
      >
        <p className="whitespace-pre-wrap break-words">{safeContent}</p>
      </div>
    </div>
  );
}
