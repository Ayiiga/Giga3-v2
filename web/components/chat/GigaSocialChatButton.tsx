"use client";

import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { UsersRound } from "lucide-react";
import Link from "next/link";

type GigaSocialChatButtonProps = {
  className?: string;
  /** Matches other chat header toolbar icons */
  variant?: "prominent" | "toolbar";
};

/**
 * GigaSocial entry point for the chat chrome.
 * Static styling only — no animations (chat-stable safe).
 */
export function GigaSocialChatButton({
  className,
  variant = "prominent",
}: GigaSocialChatButtonProps) {
  if (variant === "toolbar") {
    return (
      <Link
        href={siteConfig.links.gigasocial}
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-accent hover:bg-accent/10",
          className
        )}
        aria-label="Open GigaSocial community feed"
        title="GigaSocial"
      >
        <UsersRound className="h-4 w-4" strokeWidth={2} aria-hidden />
      </Link>
    );
  }

  return (
    <Link
      href={siteConfig.links.gigasocial}
      className={cn(
        "gigasocial-chat-entry group relative inline-flex shrink-0 items-center justify-center",
        className
      )}
      aria-label="Open GigaSocial community feed"
      title="GigaSocial — community feed"
    >
      <span
        className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-500/30 opacity-80"
        aria-hidden
      />
      <span
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md ring-2 ring-violet-200/90 sm:h-10 sm:w-10"
      >
        <UsersRound className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2.25} aria-hidden />
      </span>
      <span
        className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500"
        aria-hidden
      />
      <span className="sr-only">GigaSocial feed</span>
    </Link>
  );
}
