"use client";

import { SocialAvatar } from "@/components/gigasocial/SocialAvatar";
import { useGigaSocialStories } from "@/hooks/useGigaSocialStories";
import { getSessionToken } from "@/lib/auth";
import {
  buildStoryRingItems,
  CHAT_STORY_RING_LIMIT,
} from "@/lib/gigasocial/storyRings";
import { buildGigaSocialFeedUrl } from "@/lib/gigasocial/shareLinks";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo } from "react";

type ChatGigaSocialStoryRingsProps = {
  className?: string;
  /** Compact header layout — hides labels under rings */
  compact?: boolean;
};

/**
 * GigaSocial story rings in chat chrome — tap opens the GigaSocial feed
 * (with stories viewer) instead of embedding a heavy in-chat viewer.
 */
export const ChatGigaSocialStoryRings = memo(function ChatGigaSocialStoryRings({
  className,
  compact = true,
}: ChatGigaSocialStoryRingsProps) {
  const router = useRouter();
  const sessionToken = useMemo(() => getSessionToken(), []);
  const { reels, viewedIds, hasUnviewed, loading, offline } = useGigaSocialStories(sessionToken);

  const ringItems = useMemo(
    () => buildStoryRingItems(reels, viewedIds, { maxRings: CHAT_STORY_RING_LIMIT }),
    [reels, viewedIds]
  );

  const openFeed = useCallback(
    (ringId?: string) => {
      const href = buildGigaSocialFeedUrl({ stories: true, ring: ringId });
      router.push(href);
    },
    [router]
  );

  if (loading && !reels.length && !offline) {
    return (
      <div className={cn("flex items-center gap-1.5", className)} aria-hidden>
        <span className="h-9 w-9 rounded-full bg-muted/20 sm:h-10 sm:w-10" />
      </div>
    );
  }

  if (!ringItems.length) {
    return (
      <Link
        href={siteConfig.links.gigasocial}
        prefetch={false}
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white ring-2 ring-violet-300 sm:h-10 sm:w-10",
          className
        )}
        aria-label="Open GigaSocial community feed"
        title="GigaSocial"
      >
        <span className="text-xs font-bold" aria-hidden>
          G
        </span>
      </Link>
    );
  }

  return (
    <div
      className={cn(
        "chat-story-rings flex max-w-[9.5rem] items-center gap-1.5 overflow-x-auto overscroll-x-contain sm:max-w-[11rem]",
        className
      )}
      role="list"
      aria-label="GigaSocial stories — open feed"
    >
      {ringItems.map((item) => (
        <button
          key={item.id}
          type="button"
          role="listitem"
          className={cn(
            "flex shrink-0 flex-col items-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            compact ? "w-10 sm:w-11" : "w-14"
          )}
          onClick={() => openFeed(item.id)}
          aria-label={`Open ${item.label} stories in GigaSocial${item.hasUnviewed ? ", new content" : ""}`}
          title={`${item.label} — open in GigaSocial`}
        >
          <SocialAvatar
            name={item.label}
            avatarUrl={item.avatarUrl}
            size={compact ? "md" : "lg"}
            hasStory
            hasUnviewedStory={item.hasUnviewed}
          />
          {!compact ? (
            <span className="mt-0.5 w-full truncate text-[10px] font-medium text-foreground">
              {item.label}
            </span>
          ) : null}
        </button>
      ))}
      {hasUnviewed ? <span className="sr-only">New GigaSocial stories available</span> : null}
    </div>
  );
});
