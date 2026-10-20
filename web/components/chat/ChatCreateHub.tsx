"use client";

import {
  CHAT_PLUS_SECTIONS,
  resolveChatCreateRoute,
  type ChatCreateActionId,
  type ChatCreateMenuSection,
} from "@/lib/chat/chatCreateMenu";
import type { DocumentTemplateId } from "@/lib/chat/documentTemplates";
import {
  writeLiveWebEnabled,
  writeLiveWebMode,
  writeResearchCapability,
} from "@/lib/chat/liveWebPreferences";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { memo } from "react";

export function runChatCreateAction(args: {
  action: ChatCreateActionId;
  router: { push: (href: string) => void };
  onMediaAction: (action: ChatCreateActionId) => void;
  onSelectDocumentTemplate: (templateId: DocumentTemplateId) => void;
  onInsertTemplate: (text: string) => void;
  onNotice?: (message: string) => void;
  onClose: () => void;
}) {
  const route = resolveChatCreateRoute(args.action);

  if (route.kind === "media") {
    args.onMediaAction(route.action);
    args.onClose();
    return;
  }

  if (route.kind === "web-search") {
    writeLiveWebEnabled(true);
    writeLiveWebMode("research");
    writeResearchCapability("live_web");
    args.onInsertTemplate("Search the live web for: ");
    args.onNotice?.("Web Search is on — ask your question and Giga3 can use live web results.");
    args.onClose();
    return;
  }

  if (route.kind === "navigate") {
    args.router.push(route.href);
    args.onClose();
    return;
  }

  if (route.kind === "template") {
    args.onSelectDocumentTemplate(route.documentId);
    args.onClose();
    return;
  }

  if (route.kind === "insert") {
    args.onInsertTemplate(route.body);
    args.onClose();
    return;
  }

  args.onClose();
}

export const ChatCreateHub = memo(function ChatCreateHub({
  menuId,
  disabled,
  sections = CHAT_PLUS_SECTIONS,
  onMediaAction,
  onSelectDocumentTemplate,
  onInsertTemplate,
  onError,
  onNotice,
  onClose,
}: {
  menuId: string;
  disabled?: boolean;
  sections?: ChatCreateMenuSection[];
  onMediaAction: (action: ChatCreateActionId) => void;
  onSelectDocumentTemplate: (templateId: DocumentTemplateId) => void;
  onInsertTemplate: (text: string) => void;
  onError: (message: string) => void;
  onNotice?: (message: string) => void;
  onClose: () => void;
}) {
  const router = useRouter();

  function handleSelect(action: ChatCreateActionId) {
    try {
      runChatCreateAction({
        action,
        router,
        onMediaAction,
        onSelectDocumentTemplate,
        onInsertTemplate,
        onNotice: onNotice ?? onError,
        onClose,
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not open that tool.");
    }
  }

  return (
    <div
      id={menuId}
      role="menu"
      aria-label="Attach and search"
      className="absolute bottom-full left-0 right-0 z-20 mb-2 max-h-[50dvh] overflow-y-auto overscroll-contain rounded-2xl border border-[#E5E7EB] bg-white p-3 shadow-lg dark:border-border dark:bg-card"
    >
      {sections.map((section) => (
        <section key={section.id} className="mb-3 last:mb-0" aria-label={section.title}>
          <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-muted">
            {section.title}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {section.items.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={disabled}
                onClick={() => handleSelect(item.id)}
                title={`${item.label} — ${item.description}${item.runtime ? ` (${item.runtime})` : ""}`}
                className={cn(
                  "flex min-h-12 flex-col items-start gap-1 rounded-2xl border border-[#E5E7EB] bg-white p-2 text-left dark:border-border dark:bg-card",
                  "hover:border-accent/40 hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                  disabled && "cursor-not-allowed opacity-50"
                )}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {item.emoji}
                </span>
                <span className="block w-full text-[13px] font-bold leading-tight text-foreground">
                  {item.label}
                </span>
                <span className="block w-full text-[11px] leading-snug text-muted">
                  {item.description}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
});
