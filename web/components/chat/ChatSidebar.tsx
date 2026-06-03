"use client";

import { Button } from "@/components/ui/Button";
import { getModeDefinition, type AiModeId } from "@/lib/aiRouter";
import { cn } from "@/lib/utils";
import { Id } from "convex/_generated/dataModel";
import { MessageSquarePlus, PanelLeftClose, PanelLeft, Trash2 } from "lucide-react";

export interface ConversationItem {
  _id: Id<"conversations">;
  title: string;
  mode: string;
  updatedAt: number;
}

interface ChatSidebarProps {
  conversations: ConversationItem[];
  activeId: Id<"conversations"> | null;
  onSelect: (id: Id<"conversations">) => void;
  onNewChat: () => void;
  onDelete: (id: Id<"conversations">) => void;
  credits: number | null;
  email: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  credits,
  email,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: ChatSidebarProps) {
  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          aria-label="Close sidebar"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(100%,280px)] flex-col border-r border-border bg-[#0a0a0f] transition-transform lg:static lg:z-0 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed && "lg:w-0 lg:overflow-hidden lg:border-0"
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <span className="truncate text-base font-semibold">Giga3 AI</span>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden rounded-xl p-2.5 text-muted hover:bg-white/8 lg:inline-flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeft className="app-icon" aria-hidden />
            ) : (
              <PanelLeftClose className="app-icon" aria-hidden />
            )}
          </button>
        </div>

        <div className="p-4">
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full justify-start"
            onClick={() => {
              onNewChat();
              onCloseMobile();
            }}
          >
            <MessageSquarePlus className="app-icon" aria-hidden />
            New chat
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-2" aria-label="Chat history">
          {conversations.length === 0 && (
            <p className="px-2 py-4 text-center text-sm text-muted">No chats yet</p>
          )}
          {conversations.map((c) => {
            const modeLabel = getModeDefinition(c.mode as AiModeId).label;
            return (
              <div
                key={c._id}
                className={cn(
                  "group mb-1 flex items-center gap-1 rounded-lg",
                  activeId === c._id && "bg-blue-500/15"
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelect(c._id);
                    onCloseMobile();
                  }}
                  className="min-w-0 flex-1 rounded-xl px-3 py-3 text-left text-base hover:bg-white/8"
                >
                  <span className="block truncate font-medium">{c.title}</span>
                  <span className="block truncate text-xs text-muted">{modeLabel}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(c._id)}
                  className="shrink-0 rounded-xl p-2.5 text-muted opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                  aria-label="Delete chat"
                >
                  <Trash2 className="app-icon" aria-hidden />
                </button>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-border p-4 text-sm text-muted">
          <p className="truncate font-medium text-foreground">{email}</p>
          <p className="mt-1">Credits: {credits ?? "—"}</p>
        </div>
      </aside>
    </>
  );
}
