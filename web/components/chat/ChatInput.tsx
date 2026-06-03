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
      className="border-t border-border bg-background/80 p-4 backdrop-blur sm:p-5"
    >
      <div className="mx-auto flex max-w-3xl items-end gap-3">
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
          className="max-h-40 min-h-[52px] flex-1 resize-none rounded-2xl border-2 border-border bg-card px-5 py-3.5 text-base outline-none ring-blue-500/60 focus:ring-2 disabled:opacity-50"
          aria-label="Chat message"
        />
        <Button type="submit" disabled={disabled || !value.trim()} size="md" aria-label="Send">
          <Send className="app-icon" aria-hidden />
        </Button>
      </div>
      <p className="mx-auto mt-3 max-w-3xl text-center text-xs text-muted sm:text-sm">
        Enter to send · Shift+Enter for new line
      </p>
    </form>
  );
}
