"use client";

import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  filterConversations,
  groupConversationsByDate,
} from "@/lib/chat/groupConversationsByDate";
import { listSavedPrompts, type SavedPrompt } from "@/lib/chat/savedPrompts";
import { getModeDefinition, isValidMode } from "@/lib/aiRouter";
import { dispatchWorkspaceNav } from "@/lib/chat/workspaceNav";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import {
  Archive,
  BookOpen,
  Coins,
  CreditCard,
  FileText,
  HelpCircle,
  Home,
  ImageIcon,
  LayoutGrid,
  MessageSquarePlus,
  Newspaper,
  PanelLeft,
  Trophy,
  PanelLeftClose,
  Pin,
  Search,
  Settings,
  Sparkles,
  Star,
  Trash2,
  User,
  UsersRound,
  Wand2,
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
  pinned?: boolean;
  archived?: boolean;
  isFavorite?: boolean;
}

interface ChatSidebarProps {
  conversations: ConversationItem[];
  conversationsLoading?: boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onPin?: (id: string, pinned: boolean) => void;
  onArchive?: (id: string, archived: boolean) => void;
  onFavorite?: (id: string, isFavorite: boolean) => void;
  email: string;
  mounted: boolean;
  credits: number | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onInsertPrompt?: (text: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

type SidebarView = "active" | "archived" | "favorites";

const PRIMARY_NAV = [
  { href: "/chat", label: "Home", icon: Home },
  { href: "/gigalearn/", label: "GigaLearn", icon: BookOpen },
  { href: "/gigasocial/", label: "GigaSocial", icon: UsersRound },
  { hash: "documents" as const, label: "My Documents", icon: FileText },
  { href: "/creator-studio/", label: "Creator Studio", icon: Sparkles },
  { href: "/marketplace/", label: "Marketplace", icon: LayoutGrid },
  { hash: "modes" as const, label: "AI Tools", icon: Wand2 },
  { hash: "news" as const, label: "News desk", icon: Newspaper },
  { hash: "sports" as const, label: "Sports desk", icon: Trophy },
] as const;

const ACCOUNT_NAV = [
  { href: "/wallet", label: "GigaWallet", icon: CreditCard },
  { href: "/workspace", label: "Workspace", icon: UsersRound },
  { href: "/subscribe", label: "Subscription", icon: Sparkles },
  { href: "/credits", label: "Credits", icon: Coins },
  { href: "/chat", label: "Settings", icon: Settings },
] as const;

function ChatSidebarComponent({
  conversations,
  conversationsLoading = false,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  onPin,
  onArchive,
  onFavorite,
  email,
  credits,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onInsertPrompt,
  search,
  onSearchChange,
}: ChatSidebarProps) {
  const [view, setView] = useState<SidebarView>("active");
  const savedPrompts = useMemo(() => listSavedPrompts(), []);

  const scoped = useMemo(() => {
    if (view === "archived") {
      return conversations.filter((c) => c.archived);
    }
    if (view === "favorites") {
      return conversations.filter((c) => c.isFavorite && !c.archived);
    }
    return conversations.filter((c) => !c.archived);
  }, [conversations, view]);

  const filtered = useMemo(
    () => filterConversations(scoped, search),
    [scoped, search]
  );

  const pinned = useMemo(
    () => filtered.filter((c) => c.pinned).sort((a, b) => b.updatedAt - a.updatedAt),
    [filtered]
  );

  const unpinned = useMemo(
    () => filtered.filter((c) => !c.pinned),
    [filtered]
  );

  const groups = useMemo(
    () => groupConversationsByDate(unpinned),
    [unpinned]
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
          "chat-sidebar-surface fixed inset-y-0 left-0 z-50 flex w-[min(100%,320px)] flex-col border-r border-border bg-card/95 backdrop-blur-sm lg:static lg:z-0 lg:translate-x-0",
          mobileOpen
            ? "translate-x-0 pointer-events-auto"
            : "-translate-x-full pointer-events-none lg:pointer-events-auto",
          collapsed && "lg:w-0 lg:overflow-hidden lg:border-0"
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <Link href="/" onClick={onCloseMobile} className="flex min-w-0 items-center gap-2.5">
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

        <div className="space-y-3 px-3 pb-2">
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
            New Chat
          </Button>

          <div className="relative lg:hidden">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search conversations…"
              aria-label="Search conversations"
              className="input-surface min-h-11 w-full rounded-xl py-2.5 pl-10 pr-3 text-sm shadow-sm"
            />
          </div>
        </div>

        <nav className="shrink-0 space-y-4 px-2 pb-2" aria-label="Chat navigation">
          <SidebarSection title="Workspace">
            {PRIMARY_NAV.map((item) => (
              <SidebarNavItem key={item.label} item={item} onNavigate={onCloseMobile} />
            ))}
          </SidebarSection>

          <SidebarSection title="Prompts">
            {savedPrompts.slice(0, 3).map((prompt) => (
              <SavedPromptRow
                key={prompt.id}
                prompt={prompt}
                onClose={onCloseMobile}
                onInsert={onInsertPrompt}
              />
            ))}
            <Link
              href="/chat"
              onClick={onCloseMobile}
              className="flex min-h-9 items-center gap-2 rounded-xl px-3 text-xs font-medium text-accent hover:bg-accent/5"
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
              Browse saved prompts
            </Link>
          </SidebarSection>
        </nav>

        <div
          id="history"
          className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border px-2 pb-3 pt-2"
        >
          <SidebarSection title="Chat History">
            <div className="mb-2 flex gap-1 px-1">
              {(
                [
                  ["active", "Chats"],
                  ["favorites", "Favorites"],
                  ["archived", "Archived"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setView(key)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[11px] font-semibold",
                    view === key
                      ? "bg-accent/15 text-accent"
                      : "text-muted hover:bg-accent/5"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </SidebarSection>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-2">
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

          {pinned.length > 0 && (
            <ConversationBlock
              label="Pinned"
              conversations={pinned}
              activeId={activeId}
              onSelect={onSelect}
              onCloseMobile={onCloseMobile}
              onDelete={onDelete}
              onPin={onPin}
              onArchive={onArchive}
              onFavorite={onFavorite}
            />
          )}

          {groups.map((group) => (
            <ConversationBlock
              key={group.label}
              label={group.label}
              conversations={group.conversations}
              activeId={activeId}
              onSelect={onSelect}
              onCloseMobile={onCloseMobile}
              onDelete={onDelete}
              onPin={onPin}
              onArchive={onArchive}
              onFavorite={onFavorite}
            />
          ))}
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-card/80 p-3">
          <SidebarSection title="Account">
            {ACCOUNT_NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={onCloseMobile}
                className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted hover:bg-accent/5 hover:text-foreground"
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            ))}
            <Link
              href="/"
              onClick={onCloseMobile}
              className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted hover:bg-accent/5 hover:text-foreground"
            >
              <HelpCircle className="h-4 w-4 shrink-0" aria-hidden />
              Help Center
            </Link>
          </SidebarSection>

          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                <User className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
                {email}
              </p>
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
              <ImageIcon className="h-5 w-5" aria-hidden />
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}

function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-muted">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function SidebarNavItem({
  item,
  onNavigate,
}: {
  item: (typeof PRIMARY_NAV)[number];
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  if ("hash" in item) {
    return (
      <button
        type="button"
        onClick={() => {
          dispatchWorkspaceNav(item.hash);
          onNavigate();
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
      href={item.href}
      onClick={onNavigate}
      className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted hover:bg-accent/5 hover:text-foreground"
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {item.label}
    </Link>
  );
}

function SavedPromptRow({
  prompt,
  onClose,
  onInsert,
}: {
  prompt: SavedPrompt;
  onClose: () => void;
  onInsert?: (text: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (onInsert) {
          onInsert(prompt.body);
          onClose();
        } else {
          dispatchWorkspaceNav("documents");
          onClose();
        }
      }}
      className="flex min-h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-xs text-muted hover:bg-accent/5 hover:text-foreground"
      title={prompt.body}
    >
      <Star className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
      <span className="truncate">{prompt.title}</span>
    </button>
  );
}

function ConversationBlock({
  label,
  conversations,
  activeId,
  onSelect,
  onCloseMobile,
  onDelete,
  onPin,
  onArchive,
  onFavorite,
}: {
  label: string;
  conversations: ConversationItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCloseMobile: () => void;
  onDelete: (id: string) => void;
  onPin?: (id: string, pinned: boolean) => void;
  onArchive?: (id: string, archived: boolean) => void;
  onFavorite?: (id: string, isFavorite: boolean) => void;
}) {
  return (
    <div className="mb-3">
      <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <ul className="space-y-0.5">
        {conversations.map((c) => {
          const active = c._id === activeId;
          const modeLabel = isValidMode(c.mode)
            ? getModeDefinition(c.mode).label
            : "Chat";
          return (
            <li key={c._id}>
              <div
                className={cn(
                  "group flex items-center gap-0.5 rounded-xl px-1",
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
                  <span className="flex items-center gap-1 truncate text-sm font-medium text-foreground">
                    {c.pinned && <Pin className="h-3 w-3 shrink-0 text-accent" aria-hidden />}
                    {c.isFavorite && (
                      <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-500" aria-hidden />
                    )}
                    <span className="truncate">{c.title || "Untitled"}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted">
                    {modeLabel}
                  </span>
                </button>
                <div className="flex shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                  {onPin && (
                    <IconAction
                      label={c.pinned ? "Unpin" : "Pin"}
                      onClick={() => onPin(c._id, !c.pinned)}
                    >
                      <Pin className="h-3.5 w-3.5" aria-hidden />
                    </IconAction>
                  )}
                  {onFavorite && (
                    <IconAction
                      label={c.isFavorite ? "Unfavorite" : "Favorite"}
                      onClick={() => onFavorite(c._id, !c.isFavorite)}
                    >
                      <Star
                        className={cn(
                          "h-3.5 w-3.5",
                          c.isFavorite && "fill-amber-400 text-amber-500"
                        )}
                        aria-hidden
                      />
                    </IconAction>
                  )}
                  {onArchive && (
                    <IconAction
                      label={c.archived ? "Unarchive" : "Archive"}
                      onClick={() => onArchive(c._id, !c.archived)}
                    >
                      <Archive className="h-3.5 w-3.5" aria-hidden />
                    </IconAction>
                  )}
                  <IconAction label="Delete" onClick={() => onDelete(c._id)} danger>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </IconAction>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function IconAction({
  label,
  onClick,
  children,
  danger,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "touch-target rounded-lg p-1.5 text-muted hover:bg-accent/10",
        danger && "hover:bg-red-500/10 hover:text-red-500"
      )}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
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
    prev.onPin === next.onPin &&
    prev.onArchive === next.onArchive &&
    prev.onFavorite === next.onFavorite &&
    prev.email === next.email &&
    prev.mounted === next.mounted &&
    prev.credits === next.credits &&
    prev.collapsed === next.collapsed &&
    prev.onToggleCollapse === next.onToggleCollapse &&
    prev.mobileOpen === next.mobileOpen &&
    prev.onCloseMobile === next.onCloseMobile &&
    prev.onInsertPrompt === next.onInsertPrompt
  );
}

export const ChatSidebar = memo(ChatSidebarComponent, sidebarPropsEqual);
