"use client";

import { GigaSocialPostEditor } from "@/components/gigasocial/editor/GigaSocialPostEditor";
import { GigaRemixBadge, GigaRemixButton } from "@/components/gigasocial/remix/GigaRemixButton";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { SocialPost } from "@/lib/gigasocial/types";
import { splitPostDisplay } from "@/lib/gigasocial/postDisplay";
import { formatRelativeTime } from "@/lib/datetime";
import { shareGigaSocialPost } from "@/lib/gigasocial/sharePost";
import { stripRemixMarker } from "@/lib/gigasocial/remixMeta";
import { postHasVisualFeedMedia } from "@/lib/gigasocial/postMedia";
import type { SocialPostTypeId } from "@/lib/gigasocial/sections";
import {
  Bookmark,
  Eye,
  Heart,
  MessageCircle,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import { memo, useMemo, useState } from "react";
import { GigaSocialCommentThread } from "@/components/gigasocial/GigaSocialCommentThread";
import { GigaSocialPostCaption } from "@/components/gigasocial/GigaSocialPostCaption";
import { GigaSocialPostCommentBox } from "@/components/gigasocial/GigaSocialPostCommentBox";
import { GigaSocialPostMedia } from "@/components/gigasocial/GigaSocialPostMedia";
import { SocialAvatar } from "@/components/gigasocial/SocialAvatar";

interface GigaSocialPostCardProps {
  post: SocialPost;
  sessionToken: string | null;
  onLike: (postId: string, liked: boolean) => Promise<void>;
  onBookmark: (postId: string, bookmarked: boolean) => Promise<void>;
  onShare: (postId: string) => Promise<void>;
  onDelete?: (postId: string) => Promise<void>;
  onEdit?: (postId: string, args: { body: string; postType: SocialPostTypeId }) => Promise<void>;
  onRemix?: (post: SocialPost) => void;
  canDelete?: boolean;
  enableEdit?: boolean;
  enableRemix?: boolean;
}

export const GigaSocialPostCard = memo(function GigaSocialPostCard({
  post,
  sessionToken,
  onLike,
  onBookmark,
  onShare,
  onDelete,
  onEdit,
  onRemix,
  canDelete = false,
  enableEdit = false,
  enableRemix = false,
}: GigaSocialPostCardProps) {
  const [liked, setLiked] = useState(Boolean(post.likedByMe));
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [bookmarked, setBookmarked] = useState(Boolean(post.bookmarkedByMe));
  const [shareCount, setShareCount] = useState(post.shareCount);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayBody = useMemo(() => stripRemixMarker(post.body), [post.body]);
  const display = useMemo(() => splitPostDisplay(displayBody), [displayBody]);
  const isVisualPost = useMemo(() => postHasVisualFeedMedia(post), [post]);

  const captionBlock = display.title ? (
    <>
      <h2 className={cn("gigasocial-post-title", isVisualPost ? "line-clamp-1" : "mt-4")}>
        {display.title}
      </h2>
      {display.description ? (
        <GigaSocialPostCaption
          className={isVisualPost ? "mt-1" : "mt-2"}
          description={display.description}
          hashtags={post.hashtags}
        />
      ) : null}
    </>
  ) : (
    <GigaSocialPostCaption
      className={isVisualPost ? undefined : "mt-3"}
      description={display.description}
      hashtags={post.hashtags}
    />
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
    <article
      className={cn(
        "gigasocial-post-card saas-card rounded-2xl border border-border hover:border-accent/25",
        isVisualPost ? "gigasocial-post-card--visual" : "p-4"
      )}
    >
      <header
        className={cn(
          "flex items-start justify-between gap-3",
          isVisualPost && "gigasocial-post-card__chrome px-4 pt-3"
        )}
      >
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

      <GigaRemixBadge
        post={post}
        className={isVisualPost ? "gigasocial-post-card__chrome px-4" : undefined}
      />

      {isVisualPost ? (
        <div className="gigasocial-post-card__content">
          <div className="gigasocial-post-card__media-region">
            <GigaSocialPostMedia post={post} allowFullView />
          </div>
          {display.title || display.description || post.hashtags?.length ? (
            <div className="gigasocial-post-card__meta px-4">{captionBlock}</div>
          ) : null}
        </div>
      ) : (
        <>
          {captionBlock}
          <GigaSocialPostMedia post={post} />
        </>
      )}

      {error ? (
        <p
          className={cn("text-xs text-red-700", isVisualPost ? "px-4 pt-2" : "mt-2")}
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div
        className={cn(
          "gigasocial-post-card__actions flex flex-wrap items-center gap-0.5 border-t border-border",
          isVisualPost
            ? "gigasocial-post-card__actions--compact mt-1 px-4 pt-2"
            : "mt-4 gap-1 pt-3"
        )}
      >
        <ActionButton
          compact={isVisualPost}
          active={liked}
          label={String(likeCount)}
          icon={Heart}
          onClick={() => void handleLike()}
          disabled={!sessionToken || busy}
        />
        <ActionButton
          compact={isVisualPost}
          label={String(post.commentCount)}
          icon={MessageCircle}
          onClick={() => setCommentsOpen((o) => !o)}
        />
        <ActionButton
          compact={isVisualPost}
          label={String(shareCount)}
          icon={Share2}
          onClick={() => void handleShare()}
          disabled={!sessionToken || busy}
        />
        <ActionButton
          compact={isVisualPost}
          active={bookmarked}
          label="Save"
          icon={Bookmark}
          onClick={() => void handleBookmark()}
          disabled={!sessionToken || busy}
          iconOnly={isVisualPost}
        />
        {enableRemix && onRemix ? (
          <GigaRemixButton
            disabled={!sessionToken || busy}
            onRemix={() => onRemix(post)}
          />
        ) : null}
        {typeof post.viewCount === "number" ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full text-muted",
              isVisualPost
                ? "min-h-8 px-2 py-1 text-[11px]"
                : "min-h-9 gap-1.5 px-3 py-1.5 text-xs font-medium"
            )}
          >
            <Eye className={isVisualPost ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
            {post.viewCount}
          </span>
        ) : null}
        {canDelete && enableEdit && onEdit ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ml-auto min-h-9 text-muted"
            onClick={() => setEditorOpen(true)}
            aria-label="Edit post"
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}
        {canDelete && onDelete ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn("min-h-9 text-red-700", !(enableEdit && onEdit) && "ml-auto")}
            onClick={() => void onDelete(post._id)}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}
      </div>

      {sessionToken ? (
        <div
          className={cn(
            "gigasocial-post-card__comment",
            isVisualPost ? "px-4 pb-3 pt-1" : "mt-3"
          )}
        >
          <GigaSocialPostCommentBox
            postId={post._id}
            sessionToken={sessionToken}
            compact={isVisualPost}
            onPosted={() => setCommentsOpen(true)}
          />
        </div>
      ) : null}

      {editorOpen && onEdit ? (
        <div className="mt-4">
          <GigaSocialPostEditor
            post={{ ...post, body: displayBody }}
            onClose={() => setEditorOpen(false)}
            onSave={async (args) => {
              await onEdit(post._id, args);
              setEditorOpen(false);
            }}
          />
        </div>
      ) : null}

      {commentsOpen && sessionToken ? (
        <div className={cn(isVisualPost ? "px-4 pb-3" : undefined)}>
          <GigaSocialCommentThread
            postId={post._id}
            sessionToken={sessionToken}
            hideComposer
          />
        </div>
      ) : null}
    </article>
  );
});

function ActionButton({
  icon: Icon,
  label,
  onClick,
  active,
  disabled,
  compact = false,
  iconOnly = false,
}: {
  icon: typeof Heart;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  compact?: boolean;
  iconOnly?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={iconOnly && label ? label : undefined}
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        compact
          ? "min-h-8 gap-1 px-2 py-1 text-[11px]"
          : "min-h-9 gap-1.5 px-3 py-1.5 text-xs",
        active ? "bg-red-50 text-red-700" : "text-muted hover:bg-muted/10 hover:text-foreground",
        disabled && "opacity-50"
      )}
    >
      <Icon
        className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4", active && "fill-current")}
        aria-hidden
      />
      {iconOnly ? <span className="sr-only">{label}</span> : label}
    </button>
  );
}
