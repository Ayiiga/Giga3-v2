"use client";

import { DocumentTemplatePicker } from "@/components/chat/DocumentTemplatePicker";
import { ToolSelector } from "@/components/chat/ToolSelector";
import {
  buildMediaStudioUrl,
  MEDIA_STUDIO_TEMPLATES,
} from "@/lib/media/studioTemplates";
import type { AiModeId } from "@/lib/aiRouter";
import { cn } from "@/lib/utils";
import { FileText, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ChatWorkspacePanelProps {
  mode: AiModeId;
  onModeChange: (mode: AiModeId) => void;
  disabled?: boolean;
  hasMessages: boolean;
  onInsertDocument: (text: string) => void;
  onError: (message: string) => void;
}

type WorkspaceTab = "modes" | "documents" | "media";

export function ChatWorkspacePanel({
  mode,
  onModeChange,
  disabled,
  hasMessages,
  onInsertDocument,
  onError,
}: ChatWorkspacePanelProps) {
  const router = useRouter();
  const [tab, setTab] = useState<WorkspaceTab>(hasMessages ? "modes" : "documents");
  const [mediaNavigating, setMediaNavigating] = useState<string | null>(null);

  async function openMediaStudio(templateId: string) {
    if (disabled || mediaNavigating) return;
    const template = MEDIA_STUDIO_TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      onError("Media template not found.");
      return;
    }
    setMediaNavigating(templateId);
    try {
      const url = buildMediaStudioUrl(template);
      router.push(url);
    } catch {
      onError("Could not open Media Studio. Try again or visit /media manually.");
      setMediaNavigating(null);
    }
  }

  const tabBtn = (id: WorkspaceTab, label: string, Icon: typeof FileText) => (
    <button
      key={id}
      type="button"
      disabled={disabled}
      onClick={() => setTab(id)}
      className={cn(
        "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all sm:text-base",
        tab === id
          ? "bg-gradient-to-r from-violet-600/30 to-blue-600/20 text-foreground shadow-lg shadow-violet-500/10 ring-1 ring-violet-500/30"
          : "text-muted hover:bg-white/5 hover:text-foreground"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      <span className="hidden xs:inline sm:inline">{label}</span>
    </button>
  );

  return (
    <div className="saas-panel shrink-0 border-b border-border/80">
      <div className="flex gap-1.5 border-b border-border/60 px-3 py-2.5 sm:px-4">
        {tabBtn("modes", "AI Modes", MessageCircle)}
        {tabBtn("documents", "Documents", FileText)}
        {tabBtn("media", "Create Media", Sparkles)}
      </div>

      <div className="max-h-[min(42vh,320px)] overflow-y-auto overscroll-y-contain">
        {tab === "modes" && (
          <ToolSelector
            value={mode}
            onChange={onModeChange}
            disabled={disabled}
            embedded
          />
        )}

        {tab === "documents" && (
          <DocumentTemplatePicker
            disabled={disabled}
            compact={hasMessages}
            embedded
            defaultOpen={!hasMessages}
            onInsert={onInsertDocument}
            onError={onError}
          />
        )}

        {tab === "media" && (
          <div className="space-y-3 px-3 py-4 sm:px-4">
            <p className="text-sm leading-relaxed text-muted sm:text-base">
              Launch AI image & video generation with ready-made prompts. Opens Media Studio safely.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {MEDIA_STUDIO_TEMPLATES.map((template) => {
                const Icon = template.icon;
                const loading = mediaNavigating === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    disabled={disabled || Boolean(mediaNavigating)}
                    onClick={() => void openMediaStudio(template.id)}
                    className={cn(
                      "saas-card group flex min-h-[5.5rem] items-start gap-3 p-4 text-left transition-all",
                      "hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-500/10",
                      loading && "ring-2 ring-violet-500/50"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-inner",
                        template.gradient
                      )}
                    >
                      {loading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-violet-300" aria-hidden />
                      ) : (
                        <Icon className="h-6 w-6 text-white" aria-hidden />
                      )}
                    </div>
                    <span className="min-w-0">
                      <span className="block text-base font-semibold text-foreground">
                        {template.title}
                      </span>
                      <span className="mt-1 block text-sm leading-snug text-muted">
                        {template.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
