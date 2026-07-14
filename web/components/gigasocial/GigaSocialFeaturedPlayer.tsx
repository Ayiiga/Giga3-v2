"use client";

import { GigaSocialPostMedia } from "@/components/gigasocial/GigaSocialPostMedia";
import { GigaSocialProfileLink } from "@/components/gigasocial/GigaSocialProfileLink";
import { GigaSocialFanButton } from "@/components/gigasocial/fans/GigaSocialFanButton";
import { formatRelativeTime } from "@/lib/datetime";
import { splitPostDisplay } from "@/lib/gigasocial/postDisplay";
import type { SocialPost } from "@/lib/gigasocial/types";
import { cn } from "@/lib/utils";
import { getUserEmail } from "@/lib/auth";
import { Pause, Play } from "lucide-react";
import Link from "next/link";
import { memo, useMemo, useState } from "react";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";

interface GigaSocialFeaturedPlayerProps {
  post: SocialPost;
  autoPlay: boolean;
  paused: boolean;
  sessionToken?: string | null;
  onPause: () => void;
  onTogglePause: () => void;
  onSkipNext?: () => void;
  onSkipPrevious?: () => void;
  onVideoEnded?: () => void;
  enableSwipeSkip?: boolean;
}

export const GigaSocialFeaturedPlayer = memo(function GigaSocialFeaturedPlayer({
  post,
  autoPlay,
  paused,
  onPause,
  onTogglePause,
  onSkipNext,
  onSkipPrevious,
  onVideoEnded,
  enableSwipeSkip = false,
  sessionToken = null,
}: GigaSocialFeaturedPlayerProps) {
  const display = useMemo(() => splitPostDisplay(post.body), [post.body]);
  const preview = display.description || display.title || post.body;
  const [following, setFollowing] = useState(Boolean(post.author.supportingByMe));
  const myUserId = useMemo(() => getUserEmail(), []);
  const canFollow = Boolean(
    sessionToken && post.author.userId && myUserId !== post.author.userId
  );

  const swipe = useSwipeGesture({
    enabled: enableSwipeSkip && Boolean(onSkipNext || onSkipPrevious),
    onSwipeUp: onSkipNext,
    onSwipeDown: onSkipPrevious,
  });

  return (
    <section
      className="overflow-hidden rounded-2xl border border-accent/20 bg-card shadow-sm"
      aria-label="Featured post"
      onTouchStart={swipe.onTouchStart}
      onTouchEnd={swipe.onTouchEnd}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <GigaSocialProfileLink
          handle={post.author.handle}
          displayName={post.author.displayName}
          avatarUrl={post.author.avatarUrl}
          avatarSize="sm"
          showFollowOnAvatar={canFollow}
          creatorId={post.author.userId}
          sessionToken={sessionToken}
          supporting={following}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-accent">Now playing</p>
          <p className="truncate text-sm font-semibold text-foreground">
            {post.author.displayName}
            <span className="font-normal text-muted"> · @{post.author.handle}</span>
          </p>
          <p className="text-xs text-muted">{formatRelativeTime(post.createdAt)}</p>
        </GigaSocialProfileLink>
        <div className="flex shrink-0 items-center gap-2">
          {canFollow ? (
            <GigaSocialFanButton
              sessionToken={sessionToken!}
              creatorId={post.author.userId!}
              supporting={following}
              useFollowLabels
              compact
              onChange={setFollowing}
            />
          ) : null}
          <button
          type="button"
          onClick={onTogglePause}
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
            paused
              ? "border-accent/30 bg-accent/10 text-accent"
              : "border-border bg-white text-foreground hover:border-accent/25"
          )}
          aria-label={paused ? "Resume autoplay" : "Pause autoplay"}
          aria-pressed={paused}
        >
          {paused ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
        </button>
        </div>
      </div>

      <GigaSocialPostMedia
        post={post}
        autoPlay={autoPlay}
        paused={paused}
        featured
        onUserPaused={onPause}
        onVideoEnded={onVideoEnded}
        className="gigasocial-featured-media"
      />

      {preview ? (
        <div className="border-t border-border px-4 py-3">
          {display.title ? (
            <h2 className="gigasocial-post-title text-base">{display.title}</h2>
          ) : null}
          <p className="mt-1 line-clamp-2 text-sm text-muted">{preview}</p>
          <Link
            href={`#gigasocial-post-${post._id}`}
            className="mt-2 inline-block text-xs font-medium text-accent hover:underline"
          >
            View full post
          </Link>
        </div>
      ) : null}
    </section>
  );
});
