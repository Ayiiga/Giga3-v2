"use client";

import { ThemeToggle } from "@/components/chat/ThemeToggle";
import { CreditBadge } from "@/components/billing/CreditBadge";
import { clearAllClientAuth } from "@/lib/auth";
import { isSupabaseDataBackend } from "@/lib/dataBackend";
import {
  WORKSPACE_NAV_EVENT,
  type WorkspaceNavTarget,
} from "@/lib/chat/workspaceNav";
import { siteConfig } from "@/lib/site";
import { signOutSupabase } from "@/lib/supabase/auth";
import {
  Bell,
  BookOpen,
  Briefcase,
  GraduationCap,
  HelpCircle,
  Info,
  MessageSquarePlus,
  MoreHorizontal,
  Settings,
  Share2,
  Sparkles,
  Store,
  Users,
  Wallet,
  Zap,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useRef, useState } from "react";

interface ChatMoreMenuProps {
  credits: number | null;
  onOpenWorkspace?: () => void;
  onShare?: () => void;
  className?: string;
}

type MenuLink = {
  href: string;
  label: string;
  icon: typeof BookOpen;
};

const MORE_LINKS: MenuLink[] = [
  { href: "/gigalearn/", label: "GigaLearn", icon: GraduationCap },
  { href: "/creator-studio/", label: "Creator Studio", icon: Sparkles },
  { href: "/marketplace/", label: "Marketplace", icon: Store },
  { href: "/wallet/", label: "Wallet", icon: Wallet },
  { href: "/enterprise/", label: "Enterprise", icon: Briefcase },
  { href: "/automation/", label: "Automation", icon: Zap },
  { href: siteConfig.links.media, label: "Media Studio", icon: Sparkles },
  { href: "/install/", label: "Invite Friends", icon: Users },
  { href: siteConfig.links.dashboard, label: "Settings", icon: Settings },
  { href: "/about/", label: "About", icon: Info },
  { href: "/chat/", label: "Help", icon: HelpCircle },
];

export const ChatMoreMenu = memo(function ChatMoreMenu({
  credits,
  onOpenWorkspace,
  onShare,
  className,
}: ChatMoreMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close, open]);

  function signOut() {
    if (isSupabaseDataBackend()) {
      void signOutSupabase();
    } else {
      clearAllClientAuth();
    }
    router.push("/chat/login");
    close();
  }

  return (
    <div ref={rootRef} className={className}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-accent/10 hover:text-foreground"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
      >
        <MoreHorizontal className="h-5 w-5" aria-hidden />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="More chat actions"
          className="absolute right-0 top-full z-50 mt-1 max-h-[min(70vh,28rem)] w-60 overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-lg"
        >
          {credits != null ? (
            <div className="px-3 py-2">
              <CreditBadge credits={credits} className="w-full justify-center" />
            </div>
          ) : null}

          {onOpenWorkspace ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent(WORKSPACE_NAV_EVENT, {
                    detail: { target: "modes" satisfies WorkspaceNavTarget },
                  })
                );
                onOpenWorkspace();
                close();
              }}
              className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-accent/10"
            >
              <MessageSquarePlus className="h-4 w-4 text-muted" aria-hidden />
              Workspace tools
            </button>
          ) : null}

          {onShare ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onShare();
                close();
              }}
              className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-accent/10"
            >
              <Share2 className="h-4 w-4 text-muted" aria-hidden />
              Share conversation
            </button>
          ) : null}

          <div className="my-1 border-t border-border" role="separator" />

          {MORE_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                role="menuitem"
                onClick={close}
                className="flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-accent/10"
              >
                <Icon className="h-4 w-4 text-muted" aria-hidden />
                {item.label}
              </Link>
            );
          })}

          <div className="my-1 border-t border-border" role="separator" />

          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs text-muted">Theme</span>
            <ThemeToggle variant="toolbar" />
          </div>

          <button
            type="button"
            role="menuitem"
            className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted hover:bg-accent/10"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
});
