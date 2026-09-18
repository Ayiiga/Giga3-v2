"use client";

import { DOCUMENT_TEMPLATES, type DocumentTemplateId } from "@/lib/chat/documentTemplates";
import { dispatchWorkspaceNav } from "@/lib/chat/workspaceNav";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, LayoutTemplate } from "lucide-react";
import { useState } from "react";

const CODE_AFRICAN_CONTEXT_BODY = `💻 Coding task (African context)

Language:
Task:
African context to include (e.g. mobile money / MoMo, Ghanaian names, GHS currency):

\`\`\`
// code here
\`\`\`
`;

const LESSON_PLAN_BODY = `🎓 Lesson plan (GigaLearn practice)

Topic:
Level (e.g. JHS, BECE, WASSCE):
Objectives:
Activities:
Practice questions (5):
`;

type FeaturedTemplate =
  | { kind: "document"; templateId: DocumentTemplateId; emoji: string; title: string; subtitle: string }
  | { kind: "insert"; body: string; emoji: string; title: string; subtitle: string };

const FEATURED_TEMPLATES: FeaturedTemplate[] = [
  { kind: "document", templateId: "book-writing", emoji: "📚", title: "Book Template", subtitle: "Generate book outline" },
  { kind: "document", templateId: "research-paper", emoji: "🔬", title: "Research Paper", subtitle: "Research writing" },
  { kind: "document", templateId: "essay", emoji: "📝", title: "Essay", subtitle: "Essay with citations" },
  { kind: "document", templateId: "resume", emoji: "💼", title: "CV", subtitle: "CV for Ghana job" },
  { kind: "insert", body: CODE_AFRICAN_CONTEXT_BODY, emoji: "💻", title: "Code", subtitle: "Coding with African context" },
  { kind: "insert", body: LESSON_PLAN_BODY, emoji: "🎓", title: "Lesson Plan", subtitle: "GigaLearn practice" },
];

/**
 * Templates dropdown — 2-column grid of global writing templates.
 * Selecting a template inserts text into the chat input and opens the
 * workspace Templates tab (interconnected with the drawer).
 */
export function TemplatesDropdown({
  disabled,
  onInsert,
  onSelectDocumentTemplate,
  onError,
}: {
  disabled?: boolean;
  onInsert: (text: string) => void;
  onSelectDocumentTemplate: (templateId: DocumentTemplateId) => void;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);

  function select(item: FeaturedTemplate) {
    try {
      if (item.kind === "document") {
        const template = DOCUMENT_TEMPLATES.find((t) => t.id === item.templateId);
        if (!template) {
          onError("Template not found.");
          return;
        }
        onSelectDocumentTemplate(item.templateId);
      } else {
        onInsert(item.body);
      }
      // Interconnected: template selection also opens the workspace Templates tab.
      dispatchWorkspaceNav("documents");
      setOpen(false);
    } catch {
      onError("Could not load template. Please try again.");
    }
  }

  return (
    <div className="px-3 py-2 sm:px-4">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full min-h-11 items-center justify-between gap-2 rounded-xl px-1 text-left text-base font-medium text-foreground hover:text-accent disabled:opacity-50"
      >
        <span className="flex items-center gap-2.5">
          <LayoutTemplate className="h-6 w-6 text-accent" aria-hidden />
          Templates
        </span>
        {open ? (
          <ChevronUp className="h-6 w-6 text-muted" aria-hidden />
        ) : (
          <ChevronDown className="h-6 w-6 text-muted" aria-hidden />
        )}
      </button>

      {open ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {FEATURED_TEMPLATES.map((item) => (
            <button
              key={item.title}
              type="button"
              disabled={disabled}
              onClick={() => select(item)}
              className={cn(
                "flex min-h-12 flex-col items-start gap-1 rounded-2xl border border-[#E5E7EB] bg-white p-2.5 text-left shadow-sm",
                "hover:border-[#EAB308] hover:bg-amber-50/50",
                disabled && "pointer-events-none opacity-50"
              )}
            >
              <span className="text-lg leading-none" aria-hidden>
                {item.emoji}
              </span>
              <span className="block w-full text-[13px] font-bold leading-tight text-black">
                {item.title}
              </span>
              <span className="block w-full text-[11px] leading-snug text-gray-500">
                {item.subtitle}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
