"use client";

import {
  CHAT_CREATE_SECTIONS,
  resolveChatCreateRoute,
  type ChatCreateActionId,
} from "@/lib/chat/chatCreateMenu";
import {
  DOCUMENT_TEMPLATES,
} from "@/lib/chat/documentTemplates";
import { resolveTemplatePlaceholders } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { memo } from "react";

export const ChatCreateHub = memo(function ChatCreateHub({
  menuId,
  disabled,
  onMediaAction,
  onInsertTemplate,
  onError,
  onClose,
}: {
  menuId: string;
  disabled?: boolean;
  onMediaAction: (action: ChatCreateActionId) => void;
  onInsertTemplate: (text: string) => void;
  onError: (message: string) => void;
  onClose: () => void;
}) {
  const router = useRouter();

  function handleSelect(action: ChatCreateActionId) {
    const route = resolveChatCreateRoute(action);

    if (route.kind === "media") {
      onMediaAction(route.action);
      onClose();
      return;
    }

    if (route.kind === "navigate") {
      router.push(route.href);
      onClose();
      return;
    }

    if (route.kind === "template") {
      const template = DOCUMENT_TEMPLATES.find((item) => item.id === route.documentId);
      if (!template) {
        onError("Template not found.");
        return;
      }
      onInsertTemplate(resolveTemplatePlaceholders(template.body));
      onClose();
      return;
    }

    if (route.kind === "insert") {
      onInsertTemplate(route.body);
      onClose();
      return;
    }

    onClose();
  }

  return (
    <div
      id={menuId}
      role="menu"
      aria-label="Create hub"
      className="absolute bottom-full left-0 z-20 mb-2 w-[min(100vw-2rem,24rem)] max-h-[min(70dvh,28rem)] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-2 shadow-lg"
    >
      {CHAT_CREATE_SECTIONS.map((section) => (
        <section key={section.id} className="mb-2 last:mb-0" aria-label={section.title}>
          <p className="sticky top-0 z-[1] bg-card px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
            {section.title}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={disabled}
                onClick={() => handleSelect(item.id)}
                className={cn(
                  "flex w-full min-h-11 items-start gap-2.5 rounded-xl px-2.5 py-2 text-left",
                  "hover:bg-accent/10 focus-visible:bg-accent/10 focus-visible:outline-none",
                  disabled && "cursor-not-allowed opacity-50"
                )}
              >
                <span className="text-base leading-none" aria-hidden>
                  {item.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{item.label}</span>
                  <span className="block text-xs text-muted">{item.description}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
});
