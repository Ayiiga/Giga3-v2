"use client";

import { Button } from "@/components/ui/Button";
import { getModeDefinition, isValidMode, type AiModeId } from "@/lib/aiRouter";
import { cn } from "@/lib/utils";
import { Id } from "convex/_generated/dataModel";
import {
  Coins,
  MessageSquarePlus,
  PanelLeft,
  PanelLeftClose,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";

export interface ConversationItem {
  _id: Id<"conversations">;
  title: string;
  mode: string;
  updatedAt: number;
}

interface ChatSidebarProps {
  conversations: ConversationItem[];
  conversationsLoading?: boolean;
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
  conversationsLoading = false,
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
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Close sidebar"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(100%,300px)] flex-col border-r border-border bg-white shadow-lg transition-transform lg:static lg:z-0 lg:translate-x-0 lg:shadow-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed && "lg:w-0 lg:overflow-hidden lg:border-0"
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border/80 p-4">
          <span className="truncate text-base font-bold">Giga3 AI</span>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden rounded-xl p-2.5 text-foreground hover:bg-zinc-100 lg:inline-flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeft className="h-5 w-5" aria-hidden /> : <PanelLeftClose className="h-5 w-5" aria-hidden />}
          </button>
        </div>

        <div className="space-y-3 p-4">
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full justify-start gap-3 text-base"
            onClick={() => {
              onNewChat();
              onCloseMobile();
            }}
          >
            <MessageSquarePlus className="h-6 w-6" aria-hidden />
            New chat
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/media"
              onClick={onCloseMobile}
              className="saas-card flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 py-2 text-sm font-bold text-violet-800 transition-all hover:bg-violet-50"
            >
              <Sparkles className="h-5 w-5" aria-hidden />
              Media
            </Link>
            <Link
              href="/credits"
              onClick={onCloseMobile}
              className="saas-card flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 py-2 text-sm font-bold text-foreground transition-all hover:bg-zinc-50"
            >
              <Coins className="h-5 w-5" aria-hidden />
              Credits
            </Link>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {conversationsLoading && (
            <p className="px-2 py-4 text-sm font-medium text-muted">Loading chats…</p>
          )}
          {!conversationsLoading && conversations.length === 0 && (
            <p className="px-2 py-4 text-sm font-medium text-muted">No conversations yet.</p>
          )}
          <ul className="space-y-1.5">
            {conversations.map((c) => {
              const active = c._id === activeId;
              const modeLabel = isValidMode(c.mode)
                ? getModeDefinition(c.mode).label
                : "Chat";
              return (
                <li key={c._id}>
                  <div
                    className={cn(
                      "group flex items-center gap-2 rounded-xl border px-3 py-3 transition-all",
                      active
                        ? "border-violet-400 bg-violet-50"
                        : "border-transparent hover:border-zinc-200 hover:bg-zinc-50"
                    )}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        onSelect(c._id);
                        onCloseMobile();
                      }}
                    >
                      <span className="block truncate text-sm font-bold text-foreground sm:text-base">
                        {c.title || "Untitled"}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted sm:text-sm">
                        {modeLabel}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-zinc-600 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-700 group-hover:opacity-100"
                      aria-label="Delete conversation"
                      onClick={() => onDelete(c._id)}
                    >
                      <Trash2 className="h-5 w-5" aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t border-border/80 p-4">
          <p className="truncate text-sm font-bold text-foreground">{email}</p>
          <p className="mt-1 text-sm text-muted">
            {credits != null ? `${credits} credits remaining` : "Loading credits…"}
          </p>
        </div>
      </aside>
    </>
  );
}
