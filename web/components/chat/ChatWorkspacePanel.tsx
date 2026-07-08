"use client";

import { DocumentTemplatePicker } from "@/components/chat/DocumentTemplatePicker";
import { ImageStudioQuickPanel } from "@/components/chat/ImageStudioQuickPanel";
import { ToolSelector } from "@/components/chat/ToolSelector";
import { NewsDeskPanel } from "@/components/news/NewsDeskPanel";
import { GenerationAlertsPanel } from "@/components/generation/GenerationAlertsPanel";
import { PushAlertsPanel } from "@/components/pwa/PushAlertsPanel";
import { SportsDeskPanel } from "@/components/sports/SportsDeskPanel";
import { getSessionToken } from "@/lib/auth";
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
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Bell, BookOpen, ChevronDown, FileText, Loader2, MessageCircle, Newspaper, Sparkles, Trophy } from "lucide-react";
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

type WorkspaceTab = "modes" | "documents" | "media" | "news" | "sports" | "alerts";

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
  const [sessionToken] = useState(() => getSessionToken());
  const [open, setOpen] = useState(!hasMessages);
  const [tab, setTab] = useState<WorkspaceTab>(hasMessages ? "modes" : "documents");
  const [navigatedOpen, setNavigatedOpen] = useState(false);
  const [mediaNavigating, setMediaNavigating] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "news") {
      setOpen(true);
      setTab("news");
    }
  }, [mode]);

  useEffect(() => {
    if (hasMessages && !navigatedOpen) {
      setOpen(false);
      return;
    }
    if (!hasMessages) {
      setOpen(true);
      if (mode !== "news") {
        setTab("documents");
      }
    }
  }, [hasMessages, mode, navigatedOpen]);

  useEffect(() => {
    function onWorkspaceNav(event: Event) {
      const target = (event as CustomEvent<{ target: WorkspaceNavTarget }>).detail
        ?.target;
      if (!target) return;
      if (target === "history") {
        scrollToChatHistory();
        return;
      }
      if (target === "modes" || target === "documents" || target === "media" || target === "news" || target === "sports" || target === "alerts") {
        setNavigatedOpen(true);
        setOpen(true);
        setTab(target);
      }
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
    <div
      id="modes"
      className={cn(
        "shrink-0 border-b border-border bg-card",
        hasMessages && !open && "hidden sm:block"
      )}
    >
      <button
        type="button"
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            setNavigatedOpen(next);
            return next;
          });
        }}
        aria-expanded={open}
        className="flex w-full min-h-11 items-center justify-between gap-2 px-4 py-2.5 text-left"
      >
        <span className="text-sm font-medium text-muted">Workspace</span>
        <span className="flex items-center gap-2 text-sm text-foreground">
          {tab === "modes" && "AI modes"}
          {tab === "documents" && "Templates"}
          {tab === "media" && "Media studio"}
          {tab === "news" && "News desk"}
          {tab === "sports" && "Sports desk"}
          {tab === "alerts" && "Push alerts"}
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
            {tabBtn("news", "News", Newspaper)}
            {tabBtn("sports", "Sports", Trophy)}
            {tabBtn("alerts", "Alerts", Bell)}
            {tabBtn("media", "Media", Sparkles)}
          </div>

          <div
            className={cn(
              "overflow-y-auto overscroll-y-contain border-t border-border bg-background",
              tab === "news" || tab === "sports" || tab === "alerts"
                ? "max-h-[min(50vh,420px)]"
                : tab === "modes"
                  ? "max-h-[min(42vh,300px)]"
                  : "max-h-[200px]"
            )}
          >
            {tab === "modes" && (
              <div className="space-y-3 px-3 py-3 sm:px-4">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => router.push(`${siteConfig.links.gigalearn}/`)}
                  className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-border bg-zinc-50/50 p-3 text-left hover:border-accent/25 hover:bg-accent/5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
                    <BookOpen className="h-5 w-5 text-white" aria-hidden />
                  </div>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">GigaLearn</span>
                    <span className="mt-0.5 block line-clamp-2 text-xs text-muted">
                      AI learning studio — homework help, quizzes, lesson notes, and study plans.
                    </span>
                  </span>
                </button>
                <ToolSelector
                  value={mode}
                  onChange={onModeChange}
                  disabled={disabled}
                  embedded
                />
              </div>
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

            {tab === "news" && (
              <div id="news">
                {sessionToken ? (
                  <NewsDeskPanel sessionToken={sessionToken} variant="chat" />
                ) : (
                  <p className="px-4 py-6 text-sm text-muted">
                    Sign in to load headlines and verify news claims.
                  </p>
                )}
              </div>
            )}

            {tab === "sports" && (
              <div id="sports">
                {sessionToken ? (
                  <SportsDeskPanel sessionToken={sessionToken} variant="chat" />
                ) : (
                  <p className="px-4 py-6 text-sm text-muted">
                    Sign in to load live sports scores and updates.
                  </p>
                )}
              </div>
            )}

            {tab === "alerts" && (
              <div id="alerts" className="space-y-3 p-3 sm:p-4">
                <GenerationAlertsPanel embedded />
                <PushAlertsPanel embedded />
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
