"use client";

import { DocumentTemplatePicker } from "@/components/chat/DocumentTemplatePicker";
import { ImageStudioQuickPanel } from "@/components/chat/ImageStudioQuickPanel";
import { ToolSelector } from "@/components/chat/ToolSelector";
import {
  buildMediaStudioUrl,
  MEDIA_STUDIO_TEMPLATES,
} from "@/lib/media/studioTemplates";
import type { AiModeId } from "@/lib/aiRouter";
import {
  WORKSPACE_NAV_EVENT,
  scrollToChatHistory,
  type WorkspaceNavTarget,
} from "@/lib/chat/workspaceNav";
import { cn } from "@/lib/utils";
import { ChevronDown, FileText, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useEffect, useState } from "react";

interface ChatWorkspacePanelProps {
  mode: AiModeId;
  onModeChange: (mode: AiModeId) => void;
  disabled?: boolean;
  hasMessages: boolean;
  sourceImageUrl?: string;
  onInsertDocument: (text: string) => void;
  onError: (message: string) => void;
}

type WorkspaceTab = "modes" | "documents" | "media";

function ChatWorkspacePanelComponent({
  mode,
  onModeChange,
  disabled,
  hasMessages,
  sourceImageUrl,
  onInsertDocument,
  onError,
}: ChatWorkspacePanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(!hasMessages);
  const [tab, setTab] = useState<WorkspaceTab>(hasMessages ? "modes" : "documents");
  const [mediaNavigating, setMediaNavigating] = useState<string | null>(null);

  useEffect(() => {
    if (hasMessages) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setTab("documents");
  }, [hasMessages]);

  useEffect(() => {
    function onWorkspaceNav(event: Event) {
      const target = (event as CustomEvent<{ target: WorkspaceNavTarget }>).detail
        ?.target;
      if (!target) return;
      if (target === "history") {
        scrollToChatHistory();
        return;
      }
      setOpen(true);
      setTab(target);
    }
    window.addEventListener(WORKSPACE_NAV_EVENT, onWorkspaceNav);
    return () => window.removeEventListener(WORKSPACE_NAV_EVENT, onWorkspaceNav);
  }, []);

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
        "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium",
        tab === id
          ? "bg-card text-accent shadow-sm ring-1 ring-accent/15"
          : "text-muted hover:bg-accent/5 hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <div id="modes" className="shrink-0 border-b border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full min-h-11 items-center justify-between gap-2 px-4 py-2.5 text-left"
      >
        <span className="text-sm font-medium text-muted">Workspace</span>
        <span className="flex items-center gap-2 text-sm text-foreground">
          {tab === "modes" && "AI modes"}
          {tab === "documents" && "Templates"}
          {tab === "media" && "Media studio"}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted",
              open && "rotate-180"
            )}
            aria-hidden
          />
        </span>
      </button>

      {open && (
        <>
          <div className="flex gap-1 border-t border-border px-2 py-2">
            {tabBtn("modes", "Modes", MessageCircle)}
            {tabBtn("documents", "Docs", FileText)}
            {tabBtn("media", "Media", Sparkles)}
          </div>

          <div className="max-h-[200px] overflow-y-auto overscroll-y-contain border-t border-border bg-background">
            {tab === "modes" && (
              <ToolSelector
                value={mode}
                onChange={onModeChange}
                disabled={disabled}
                embedded
              />
            )}

            {tab === "documents" && (
              <div id="files">
              <DocumentTemplatePicker
                disabled={disabled}
                compact={hasMessages}
                embedded
                defaultOpen={!hasMessages}
                onInsert={onInsertDocument}
                onError={onError}
              />
              </div>
            )}

            {tab === "media" && (
              <div className="space-y-3 px-3 py-3 sm:px-4">
                <ImageStudioQuickPanel sourceUrl={sourceImageUrl} />
                <p className="text-sm leading-[1.7] text-muted">
                  Or launch a full studio template:
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                          "flex min-h-16 items-center gap-3 rounded-xl border border-border bg-zinc-50/50 p-3 text-left",
                          loading && "ring-1 ring-accent/30"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br",
                            template.gradient
                          )}
                        >
                          {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden />
                          ) : (
                            <Icon className="h-5 w-5 text-white" aria-hidden />
                          )}
                        </div>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-foreground">
                            {template.title}
                          </span>
                          <span className="mt-0.5 block line-clamp-2 text-xs text-muted">
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
        </>
      )}
    </div>
  );
}

function workspacePropsEqual(
  prev: ChatWorkspacePanelProps,
  next: ChatWorkspacePanelProps
): boolean {
  return (
    prev.mode === next.mode &&
    prev.onModeChange === next.onModeChange &&
    prev.disabled === next.disabled &&
    prev.hasMessages === next.hasMessages &&
    prev.sourceImageUrl === next.sourceImageUrl &&
    prev.onInsertDocument === next.onInsertDocument &&
    prev.onError === next.onError
  );
}

export const ChatWorkspacePanel = memo(
  ChatWorkspacePanelComponent,
  workspacePropsEqual
);
