"use client";

import { ThemeToggle } from "@/components/chat/ThemeToggle";
import { clearAllClientAuth } from "@/lib/auth";
import { isSupabaseDataBackend } from "@/lib/dataBackend";
import { signOutSupabase } from "@/lib/supabase/auth";
import {
  HelpCircle,
  LogOut,
  Mail,
  MoreHorizontal,
  Settings,
  Shield,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useRef, useState } from "react";

interface ChatMoreMenuProps {
  credits: number | null;
  className?: string;
}

export const ChatMoreMenu = memo(function ChatMoreMenu({
  credits,
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
          aria-label="Account and settings"
          className="absolute right-0 top-full z-50 mt-1 max-h-[min(70vh,28rem)] w-60 overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-lg"
        >
          {credits != null ? (
            <div
              className="mx-1 mb-1 rounded-xl px-3 py-2 text-center text-sm font-semibold text-white"
              style={{ backgroundColor: "#7C3AED" }}
              role="presentation"
            >
              {credits} credits
            </div>
          ) : null}

          <Link
            href="/profile"
            role="menuitem"
            onClick={close}
            className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-accent/10"
          >
            <User className="h-4 w-4 text-muted" aria-hidden />
            Profile
          </Link>

          <Link
            href="/settings"
            role="menuitem"
            onClick={close}
            className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-accent/10"
          >
            <Settings className="h-4 w-4 text-muted" aria-hidden />
            Settings
          </Link>

          <div className="my-1 border-t border-border" role="separator" />

          <a
            href="mailto:support@giga3ai.com"
            role="menuitem"
            onClick={close}
            className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-accent/10"
          >
            <Mail className="h-4 w-4 text-muted" aria-hidden />
            support@giga3ai.com
          </a>
          <a
            href="mailto:giga3ai@gmail.com"
            role="menuitem"
            onClick={close}
            className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-accent/10"
          >
            <Mail className="h-4 w-4 text-muted" aria-hidden />
            giga3ai@gmail.com
          </a>

          <Link
            href="/help"
            role="menuitem"
            onClick={close}
            className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-accent/10"
          >
            <HelpCircle className="h-4 w-4 text-muted" aria-hidden />
            Help / FAQ
          </Link>

          <Link
            href="/privacy"
            role="menuitem"
            onClick={close}
            className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-accent/10"
          >
            <Shield className="h-4 w-4 text-muted" aria-hidden />
            Privacy &amp; Terms
          </Link>

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
