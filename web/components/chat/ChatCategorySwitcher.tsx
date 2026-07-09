"use client";

import {
  CHAT_CATEGORIES,
  getCategoryForMode,
  modeForCategory,
  type ChatCategoryId,
} from "@/lib/chat/chatCategories";
import type { AiModeId } from "@/lib/aiRouter";
import { cn } from "@/lib/utils";
import { memo } from "react";

interface ChatCategorySwitcherProps {
  mode: AiModeId;
  onModeChange: (mode: AiModeId) => void;
  disabled?: boolean;
  className?: string;
}

function ChatCategorySwitcherInner({
  mode,
  onModeChange,
  disabled,
  className,
}: ChatCategorySwitcherProps) {
  const activeCategory = getCategoryForMode(mode);

  return (
    <div
      className={cn(
        "chat-category-switcher flex min-w-0 max-w-full gap-1.5 py-2",
        className
      )}
      role="tablist"
      aria-label="AI assistance category"
    >
      {CHAT_CATEGORIES.map((category) => {
        const selected = category.id === activeCategory.id;
        return (
          <button
            key={category.id}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={disabled}
            title={category.description}
            onClick={() => onModeChange(modeForCategory(category.id as ChatCategoryId))}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              "min-h-9 touch-target",
              selected
                ? "border-accent/40 bg-accent/10 text-foreground ring-1 ring-accent/20"
                : "border-border bg-white text-muted hover:border-accent/25 hover:bg-accent/5 hover:text-foreground",
              disabled && "pointer-events-none opacity-50"
            )}
          >
            <span aria-hidden>{category.emoji}</span>
            <span>{category.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function propsEqual(
  prev: ChatCategorySwitcherProps,
  next: ChatCategorySwitcherProps
): boolean {
  return (
    prev.mode === next.mode &&
    prev.disabled === next.disabled &&
    prev.onModeChange === next.onModeChange &&
    prev.className === next.className
  );
}

export const ChatCategorySwitcher = memo(ChatCategorySwitcherInner, propsEqual);
