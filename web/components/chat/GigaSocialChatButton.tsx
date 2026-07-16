"use client";

import { useGigaSocialStories } from "@/hooks/useGigaSocialStories";
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
  const { hasUnviewed, reels } = useGigaSocialStories();
  const storiesHref =
    reels.length > 0 ? `${siteConfig.links.gigasocial}?stories=1` : siteConfig.links.gigasocial;

  if (variant === "toolbar") {
    return (
      <Link
        href={storiesHref}
        className={cn(
          "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-accent hover:bg-accent/10",
          className
        )}
        aria-label={
          hasUnviewed
            ? "Open GigaSocial — new stories available"
            : "Open GigaSocial community feed"
        }
        title="GigaSocial"
      >
        <UsersRound className="h-4 w-4" strokeWidth={2} aria-hidden />
        {hasUnviewed ? (
          <span
            className="absolute right-1 top-1 h-2 w-2 rounded-full border border-card bg-emerald-500"
            aria-hidden
          />
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      href={storiesHref}
      className={cn(
        "gigasocial-chat-entry relative inline-flex shrink-0 items-center justify-center",
        className
      )}
      aria-label={
        hasUnviewed
          ? "Open GigaSocial — new stories and reels"
          : "Open GigaSocial community feed"
      }
      title={hasUnviewed ? "GigaSocial — new reels" : "GigaSocial — community feed"}
    >
      <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-white ring-2 ring-violet-400 shadow-sm sm:h-11 sm:w-11">
        <UsersRound className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={2.25} aria-hidden />
      </span>
      {hasUnviewed ? (
        <span
          className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500"
          aria-hidden
        />
      ) : null}
      <span className="sr-only">GigaSocial feed</span>
    </Link>
  );
}
