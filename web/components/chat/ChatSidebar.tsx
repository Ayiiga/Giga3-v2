"use client";

import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  filterConversations,
  groupConversationsByDate,
} from "@/lib/chat/groupConversationsByDate";
import { getModeDefinition, isValidMode } from "@/lib/aiRouter";
import { dispatchWorkspaceNav } from "@/lib/chat/workspaceNav";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Clock,
  FolderOpen,
  GraduationCap,
  Home,
  ImageIcon,
  MessageSquarePlus,
  PanelLeft,
  PanelLeftClose,
  Search,
  Settings,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { memo, useMemo, useState } from "react";

export interface ConversationItem {
  _id: string;
  title: string;
  mode: string;
  updatedAt: number;
  convexConversationId?: string | null;
  sharePublic?: boolean;
  shareToken?: string;
}

interface ChatSidebarProps {
  conversations: ConversationItem[];
  conversationsLoading?: boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  email: string;
  mounted: boolean;
  credits: number | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/media", label: "Image Studio", icon: ImageIcon },
  { href: "/chat", label: "New Chat", icon: MessageSquarePlus, action: "new" as const },
  { hash: "modes" as const, label: "GigaLearn", icon: GraduationCap },
  { hash: "documents" as const, label: "Files", icon: FolderOpen },
  { hash: "history" as const, label: "History", icon: Clock },
  { href: "/credits", label: "Credits", icon: Settings },
] as const;

function ChatSidebarComponent({
  conversations,
  conversationsLoading = false,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  email,
  credits,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: ChatSidebarProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => filterConversations(conversations, search),
    [conversations, search]
  );
  const groups = useMemo(
    () => groupConversationsByDate(filtered),
    [filtered]
  );

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
          "chat-sidebar-surface fixed inset-y-0 left-0 z-50 flex w-[min(100%,300px)] flex-col border-r border-border lg:static lg:z-0 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed && "lg:w-0 lg:overflow-hidden lg:border-0"
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <Link
            href="/"
            onClick={onCloseMobile}
            className="flex min-w-0 items-center gap-2.5"
          >
            <BrandLogo size={28} className="shrink-0 shadow-none ring-0" />
            <span className="truncate text-base font-semibold text-foreground">
              {siteConfig.name}
            </span>
          </Link>
          <button
            type="button"
            onClick={onCloseMobile}
            className="touch-target rounded-xl text-muted hover:bg-accent/10 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="touch-target hidden rounded-xl text-muted hover:bg-accent/10 lg:inline-flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeft className="h-5 w-5" aria-hidden />
            ) : (
              <PanelLeftClose className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>

        <div className="p-3">
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full justify-start gap-2.5 shadow-sm"
            onClick={() => {
              onNewChat();
              onCloseMobile();
            }}
          >
            <MessageSquarePlus className="h-5 w-5" aria-hidden />
            New chat
          </Button>
        </div>

        <nav className="space-y-0.5 px-2" aria-label="Platform navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            if ("action" in item && item.action === "new") {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    onNewChat();
                    onCloseMobile();
                  }}
                  className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted hover:bg-accent/5 hover:text-foreground"
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {item.label}
                </button>
              );
            }
            if ("hash" in item) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    dispatchWorkspaceNav(item.hash);
                    onCloseMobile();
                  }}
                  className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-muted hover:bg-accent/5 hover:text-foreground"
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {item.label}
                </button>
              );
            }
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onCloseMobile}
                className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted hover:bg-accent/5 hover:text-foreground"
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-3 px-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              aria-label="Search conversations"
              className="input-surface min-h-10 w-full py-2 pl-9 pr-3 text-sm"
            />
          </div>
        </div>

        <div id="history" className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Recent
          </p>
          {conversationsLoading && (
            <p className="px-2 py-4 text-sm text-muted">Loading chats…</p>
          )}
          {!conversationsLoading && filtered.length === 0 && (
            <div className="premium-card mx-1 p-4 text-center">
              <BookOpen className="mx-auto h-6 w-6 text-accent" aria-hidden />
              <p className="mt-2 text-sm text-muted">
                {search ? "No matches found." : "No conversations yet."}
              </p>
            </div>
          )}
          {groups.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.conversations.map((c) => {
                  const active = c._id === activeId;
                  const modeLabel = isValidMode(c.mode)
                    ? getModeDefinition(c.mode).label
                    : "Chat";
                  return (
                    <li key={c._id}>
                      <div
                        className={cn(
                          "group flex items-center gap-1 rounded-xl px-1",
                          active
                            ? "bg-accent/10 ring-1 ring-accent/25"
                            : "hover:bg-accent/5"
                        )}
                      >
                        <button
                          type="button"
                          className="min-h-10 min-w-0 flex-1 px-2 py-2 text-left"
                          onClick={() => {
                            onSelect(c._id);
                            onCloseMobile();
                          }}
                        >
                          <span className="block truncate text-sm font-medium text-foreground">
                            {c.title || "Untitled"}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted">
                            {modeLabel}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="touch-target rounded-lg text-muted opacity-100 hover:bg-red-500/10 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"
                          aria-label="Delete conversation"
                          onClick={() => onDelete(c._id)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{email}</p>
              <p className="mt-0.5 text-xs text-muted">
                {credits != null ? `${credits} credits` : "Loading credits…"}
              </p>
            </div>
            <Link
              href="/media"
              className="touch-target rounded-xl text-accent hover:bg-accent/10"
              aria-label="Image Studio"
              title="Image Studio"
            >
              <Sparkles className="h-5 w-5" aria-hidden />
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}

function sidebarPropsEqual(prev: ChatSidebarProps, next: ChatSidebarProps): boolean {
  return (
    prev.conversations === next.conversations &&
    prev.conversationsLoading === next.conversationsLoading &&
    prev.activeId === next.activeId &&
    prev.onSelect === next.onSelect &&
    prev.onNewChat === next.onNewChat &&
    prev.onDelete === next.onDelete &&
    prev.email === next.email &&
    prev.mounted === next.mounted &&
    prev.credits === next.credits &&
    prev.collapsed === next.collapsed &&
    prev.onToggleCollapse === next.onToggleCollapse &&
    prev.mobileOpen === next.mobileOpen &&
    prev.onCloseMobile === next.onCloseMobile
  );
}

export const ChatSidebar = memo(ChatSidebarComponent, sidebarPropsEqual);
