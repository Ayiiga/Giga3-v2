"use client";

import type { ConversationItem } from "@/components/chat/ChatSidebar";
import { filterConversations } from "@/lib/chat/groupConversationsByDate";
import { isValidMode, getModeDefinition } from "@/lib/aiRouter";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

interface ChatConversationSearchProps {
  value: string;
  onChange: (value: string) => void;
  conversations: ConversationItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

export const ChatConversationSearch = memo(function ChatConversationSearch({
  value,
  onChange,
  conversations,
  activeId,
  onSelect,
  className,
}: ChatConversationSearchProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = value.trim();
    if (!q) return [];
    return filterConversations(
      conversations.filter((c) => !c.archived),
      q
    ).slice(0, 8);
  }, [conversations, value]);

  const showResults = open && value.trim().length > 0;

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [close]);

  function handleSelect(id: string) {
    onSelect(id);
    onChange("");
    close();
    inputRef.current?.blur();
  }

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onChange("");
            close();
            inputRef.current?.blur();
          }
          if (e.key === "Enter" && results[0]) {
            e.preventDefault();
            handleSelect(results[0]._id);
          }
        }}
        placeholder="Search conversations…"
        aria-label="Search conversations"
        aria-expanded={showResults}
        aria-controls={showResults ? listId : undefined}
        aria-autocomplete="list"
        role="combobox"
        className="input-surface min-h-11 w-full rounded-xl py-2.5 pl-10 pr-10 text-sm shadow-sm"
      />
      {value.trim().length > 0 && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-accent/10 hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}

      {showResults && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-50 max-h-64 overflow-y-auto overscroll-y-contain rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted" role="option" aria-selected={false}>
              No conversations match &ldquo;{value.trim()}&rdquo;
            </li>
          ) : (
            results.map((conversation) => (
              <li key={conversation._id} role="option" aria-selected={conversation._id === activeId}>
                <button
                  type="button"
                  onClick={() => handleSelect(conversation._id)}
                  className={cn(
                    "flex w-full min-h-11 flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent/5",
                    conversation._id === activeId && "bg-accent/10"
                  )}
                >
                  <span className="line-clamp-1 font-medium text-foreground">
                    {conversation.title || "Untitled chat"}
                  </span>
                  <span className="mt-0.5 text-xs text-muted">
                    {isValidMode(conversation.mode)
                      ? getModeDefinition(conversation.mode).label
                      : conversation.mode}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
});
