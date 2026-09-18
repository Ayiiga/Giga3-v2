"use client";

import {
  CHAT_CREATE_SECTIONS,
  resolveChatCreateRoute,
  type ChatCreateActionId,
} from "@/lib/chat/chatCreateMenu";
import type { DocumentTemplateId } from "@/lib/chat/documentTemplates";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { memo } from "react";

export const ChatCreateHub = memo(function ChatCreateHub({
  menuId,
  disabled,
  onMediaAction,
  onSelectDocumentTemplate,
  onInsertTemplate,
  onError,
  onClose,
}: {
  menuId: string;
  disabled?: boolean;
  onMediaAction: (action: ChatCreateActionId) => void;
  onSelectDocumentTemplate: (templateId: DocumentTemplateId) => void;
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
      onSelectDocumentTemplate(route.documentId);
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
      className="absolute bottom-full left-0 right-0 z-20 mb-2 max-h-[50dvh] overflow-y-auto overscroll-contain rounded-2xl border border-[#E5E7EB] bg-white p-3 shadow-lg"
    >
      {CHAT_CREATE_SECTIONS.map((section) => (
        <section key={section.id} className="mb-3 last:mb-0" aria-label={section.title}>
          <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
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
                  "flex min-h-12 flex-col items-start gap-1 rounded-2xl border border-[#E5E7EB] bg-white p-2 text-left",
                  "hover:border-[#EAB308] hover:bg-amber-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EAB308]/50",
                  disabled && "cursor-not-allowed opacity-50"
                )}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {item.emoji}
                </span>
                <span className="block w-full text-[13px] font-bold leading-tight text-black">
                  {item.label}
                </span>
                <span className="block w-full text-[11px] leading-snug text-gray-500">
                  {item.description}
                </span>
                {item.runtime ? (
                  <span
                    className={cn(
                      "mt-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                      item.runtime === "ON DEVICE"
                        ? "border border-[#EAB308] text-[#92600a]"
                        : "bg-[#EAB308] text-black"
                    )}
                  >
                    {item.runtime}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
});
