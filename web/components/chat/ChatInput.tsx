"use client";

import { Button } from "@/components/ui/Button";
import { Send } from "lucide-react";
import { FormEvent, KeyboardEvent, useRef, useState } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled,
  placeholder = "Message Giga3 AI…",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border bg-background/80 p-3 backdrop-blur sm:p-4"
    >
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={placeholder}
          className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none ring-accent focus:ring-2 disabled:opacity-50"
          aria-label="Chat message"
        />
        <Button type="submit" disabled={disabled || !value.trim()} size="md" aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-muted sm:text-xs">
        Enter to send · Shift+Enter for new line
      </p>
    </form>
  );
}
