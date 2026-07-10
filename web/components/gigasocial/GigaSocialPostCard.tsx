"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { SocialPost } from "@/lib/gigasocial/types";
import { splitPostDisplay } from "@/lib/gigasocial/postDisplay";
import { formatRelativeTime } from "@/lib/datetime";
import { shareGigaSocialPost } from "@/lib/gigasocial/sharePost";
import {
  Bookmark,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Trash2,
} from "lucide-react";
import { memo, useMemo, useState } from "react";
import { GigaSocialCommentThread } from "@/components/gigasocial/GigaSocialCommentThread";
import { GigaSocialPostMedia } from "@/components/gigasocial/GigaSocialPostMedia";
import { SocialAvatar } from "@/components/gigasocial/SocialAvatar";
import { renderCaptionWithHashtags } from "@/lib/gigasocial/hashtags";

interface GigaSocialPostCardProps {
  post: SocialPost;
  sessionToken: string | null;
  onLike: (postId: string, liked: boolean) => Promise<void>;
  onBookmark: (postId: string, bookmarked: boolean) => Promise<void>;
  onShare: (postId: string) => Promise<void>;
  onDelete?: (postId: string) => Promise<void>;
  canDelete?: boolean;
}

export const GigaSocialPostCard = memo(function GigaSocialPostCard({
  post,
  sessionToken,
  onLike,
  onBookmark,
  onShare,
  onDelete,
  canDelete,
}: GigaSocialPostCardProps) {
  const [liked, setLiked] = useState(Boolean(post.likedByMe));
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [bookmarked, setBookmarked] = useState(Boolean(post.bookmarkedByMe));
  const [shareCount, setShareCount] = useState(post.shareCount);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const display = useMemo(() => splitPostDisplay(post.body), [post.body]);
  const captionParts = useMemo(
    () => renderCaptionWithHashtags(display.description),
    [display.description]
  );

  async function handleLike() {
    if (!sessionToken || busy) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    setBusy(true);
    setError(null);
    try {
      await onLike(post._id, next);
    } catch (e) {
      setLiked(!next);
      setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
      setError(e instanceof Error ? e.message : "Could not update like.");
    } finally {
      setBusy(false);
    }
  }

  async function handleBookmark() {
    if (!sessionToken || busy) return;
    const next = !bookmarked;
    setBookmarked(next);
    setBusy(true);
    try {
      await onBookmark(post._id, next);
    } catch {
      setBookmarked(!next);
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    if (!sessionToken || busy) return;
    setBusy(true);
    try {
      const result = await shareGigaSocialPost(post);
      if (result.ok) {
        setShareCount((c) => c + 1);
        await onShare(post._id);
      }
    } catch {
      /* cancelled */
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="saas-card rounded-2xl border border-border p-4 transition-colors hover:border-accent/25">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <SocialAvatar
            name={post.author.displayName}
            avatarUrl={post.author.avatarUrl}
            size="md"
          />
          <div>
            <p className="text-sm font-semibold text-foreground">{post.author.displayName}</p>
            <p className="text-xs text-muted">
              @{post.author.handle} · {formatRelativeTime(post.createdAt)}
              {post.communitySlug ? ` · ${post.communitySlug}` : ""}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-muted/10 px-2 py-0.5 text-xs capitalize text-muted">
          {post.postType}
        </span>
      </header>

      {display.title ? (
        <>
          <h2 className="gigasocial-post-title mt-4">{display.title}</h2>
          {display.description ? (
            <p className="gigasocial-post-description mt-2 whitespace-pre-wrap">
              {captionParts.map((part, index) =>
                part.type === "hashtag" ? (
                  <span key={`${part.value}-${index}`} className="text-accent">
                    {part.value}
                  </span>
                ) : (
                  <span key={`${part.value}-${index}`}>{part.value}</span>
                )
              )}
            </p>
          ) : null}
        </>
      ) : (
        <p className="gigasocial-post-description mt-3 whitespace-pre-wrap">
          {captionParts.map((part, index) =>
            part.type === "hashtag" ? (
              <span key={`${part.value}-${index}`} className="text-accent">
                {part.value}
              </span>
            ) : (
              <span key={`${part.value}-${index}`}>{part.value}</span>
            )
          )}
        </p>
      )}

      {post.hashtags && post.hashtags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2" aria-label="Post hashtags">
          {post.hashtags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent"
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      <GigaSocialPostMedia post={post} />

      {error && (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-border pt-3">
        <ActionButton
          active={liked}
          label={String(likeCount)}
          icon={Heart}
          onClick={() => void handleLike()}
          disabled={!sessionToken || busy}
        />
        <ActionButton
          label={String(post.commentCount)}
          icon={MessageCircle}
          onClick={() => setCommentsOpen((o) => !o)}
        />
        <ActionButton
          label={String(shareCount)}
          icon={Share2}
          onClick={() => void handleShare()}
          disabled={!sessionToken || busy}
        />
        <ActionButton
          active={bookmarked}
          label="Save"
          icon={Bookmark}
          onClick={() => void handleBookmark()}
          disabled={!sessionToken || busy}
        />
        {typeof post.viewCount === "number" ? (
          <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted">
            <Eye className="h-4 w-4" aria-hidden />
            {post.viewCount}
          </span>
        ) : null}
        {canDelete && onDelete && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ml-auto min-h-9 text-red-700"
            onClick={() => void onDelete(post._id)}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </div>

      {commentsOpen && sessionToken && (
        <GigaSocialCommentThread postId={post._id} sessionToken={sessionToken} />
      )}
    </article>
  );
});

function ActionButton({
  icon: Icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: typeof Heart;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
        active ? "bg-red-50 text-red-700" : "text-muted hover:bg-muted/10 hover:text-foreground",
        disabled && "opacity-50"
      )}
    >
      <Icon className={cn("h-4 w-4", active && "fill-current")} aria-hidden />
      {label}
    </button>
  );
}
