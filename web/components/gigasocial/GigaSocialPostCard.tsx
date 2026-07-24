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
import { getPostMediaKind, postHasVisualFeedMedia } from "@/lib/gigasocial/postMedia";
import type { SocialPostTypeId } from "@/lib/gigasocial/sections";
import { useFeedVideoPlayback } from "@/components/gigasocial/feed/FeedVideoPlaybackProvider";
import {
  Bookmark,
  Eye,
  Heart,
  MessageCircle,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { GigaSocialCommentThread } from "@/components/gigasocial/GigaSocialCommentThread";
import { GigaSocialFanButton } from "@/components/gigasocial/fans/GigaSocialFanButton";
import { GigaSocialPostCaption } from "@/components/gigasocial/GigaSocialPostCaption";
import { GigaSocialPostCommentBox } from "@/components/gigasocial/GigaSocialPostCommentBox";
import { GigaSocialPostMedia } from "@/components/gigasocial/GigaSocialPostMedia";
import { GigaSocialProfileLink } from "@/components/gigasocial/GigaSocialProfileLink";
import { VerifiedBadge } from "@/components/gigasocial/VerifiedBadge";
import { GigaSocialTipButton } from "@/components/gigasocial/economy/GigaSocialTipButton";
import { getUserEmail } from "@/lib/auth";
import { useGigaSocialFeatures } from "@/lib/gigasocial/featureFlags";
import { triggerHaptic } from "@/lib/gigasocial/haptics";

const GigaSocialPostAIActions = dynamic(
  () =>
    import("@/components/gigasocial/ai/GigaSocialPostAIActions").then((m) => ({
      default: m.GigaSocialPostAIActions,
    })),
  { ssr: false, loading: () => null }
);

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
  enablePostAIActions?: boolean;
  enablePostTips?: boolean;
  feedAutoPlay?: boolean;
  feedPaused?: boolean;
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
  enableEdit = true,
  enableRemix = false,
  enablePostAIActions = false,
  /** Tips are open on all posts/photos/videos — not gated by 500-fan earn unlock. */
  enablePostTips = true,
  feedAutoPlay = false,
  feedPaused = false,
}: GigaSocialPostCardProps) {
  const features = useGigaSocialFeatures();
  const [liked, setLiked] = useState(Boolean(post.likedByMe));
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [bookmarked, setBookmarked] = useState(Boolean(post.bookmarkedByMe));
  const [shareCount, setShareCount] = useState(post.shareCount);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState(Boolean(post.author.supportingByMe));
  const [heartBurst, setHeartBurst] = useState(false);
  const lastTapRef = useRef(0);
  const myUserId = useMemo(() => getUserEmail(), []);
  const isOwnPost = Boolean(
    myUserId && post.author.userId && myUserId === post.author.userId
  );
  const canFollow = Boolean(sessionToken && post.author.userId && !isOwnPost);
  const canTip = Boolean(
    enablePostTips && sessionToken && post.author.userId && !isOwnPost
  );

  const displayBody = useMemo(() => stripRemixMarker(post.body), [post.body]);
  const display = useMemo(() => splitPostDisplay(displayBody), [displayBody]);
  const isVisualPost = useMemo(() => postHasVisualFeedMedia(post), [post]);
  const visualMediaKind = useMemo(
    () => (isVisualPost ? getPostMediaKind(post) : null),
    [isVisualPost, post]
  );
  const shouldAutoPlayVideo =
    feedAutoPlay && !feedPaused && visualMediaKind === "video";
  const { observeVideo, isActiveVideo } = useFeedVideoPlayback();
  const videoRegionRef = useCallback(
    (element: HTMLDivElement | null) => {
      if (shouldAutoPlayVideo) {
        observeVideo(post._id, element);
      } else {
        observeVideo(post._id, null);
      }
    },
    [observeVideo, post._id, shouldAutoPlayVideo]
  );

  const captionBlock = display.title ? (
    <>
      <h2 className={cn("gigasocial-post-title", isVisualPost ? "line-clamp-1" : "mt-4")}>
        {display.title}
      </h2>
      {display.description ? (
        <GigaSocialPostCaption
          className={isVisualPost ? "mt-1 [&_.gigasocial-post-description]:line-clamp-2" : "mt-2"}
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

  const handleLike = useCallback(
    async (forceLike = false) => {
      if (!sessionToken || busy) return;
      const next = forceLike ? true : !liked;
      if (forceLike && liked) {
        setHeartBurst(true);
        window.setTimeout(() => setHeartBurst(false), 450);
        return;
      }
      setLiked(next);
      setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
      if (next) {
        setHeartBurst(true);
        window.setTimeout(() => setHeartBurst(false), 450);
        triggerHaptic("success", features.enableHaptics);
      }
      setBusy(true);
      setError(null);
      try {
        await onLike(post._id, next);
      } catch (e) {
        setLiked(!next);
        setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
        setError(e instanceof Error ? e.message : "Could not update like.");
        triggerHaptic("error", features.enableHaptics);
      } finally {
        setBusy(false);
      }
    },
    [busy, features.enableHaptics, liked, onLike, post._id, sessionToken]
  );

  const handleDoubleTapLike = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      void handleLike(true);
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
  }, [handleLike]);

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
        "gigasocial-post-card saas-card rounded-2xl border border-border",
        isVisualPost
          ? cn(
              "gigasocial-post-card--visual",
              visualMediaKind === "video"
                ? "gigasocial-post-card--video"
                : visualMediaKind === "gallery" || visualMediaKind === "photo-music"
                  ? "gigasocial-post-card--gallery"
                  : "gigasocial-post-card--photo"
            )
          : "p-4"
      )}
    >
      <header
        className={cn(
          "flex items-start justify-between gap-3",
          isVisualPost && "gigasocial-post-card__chrome px-4 pt-3"
        )}
      >
        <GigaSocialProfileLink
          handle={post.author.handle}
          displayName={post.author.displayName}
          avatarUrl={post.author.avatarUrl}
          avatarSize="md"
          showFollowOnAvatar={canFollow}
          creatorId={post.author.userId}
          sessionToken={sessionToken}
          supporting={following}
          onFollowChange={setFollowing}
        >
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate text-sm font-semibold text-foreground">
              {post.author.displayName}
            </span>
            <VerifiedBadge verified={post.author.verified} />
          </span>
          <span className="block truncate text-xs text-muted">
            @{post.author.handle} · {formatRelativeTime(post.createdAt)}
            {post.communitySlug ? ` · ${post.communitySlug}` : ""}
          </span>
        </GigaSocialProfileLink>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
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
          <span className="rounded-full bg-muted/10 px-2 py-0.5 text-xs capitalize text-muted">
            {post.postType}
          </span>
        </div>
      </header>

      <GigaRemixBadge
        post={post}
        className={isVisualPost ? "gigasocial-post-card__chrome px-4" : undefined}
      />

      {isVisualPost ? (
        <div className="gigasocial-post-card__content">
          <div
            ref={visualMediaKind === "video" ? videoRegionRef : undefined}
            className="gigasocial-post-card__media-region relative"
            onDoubleClick={() => void handleLike(true)}
            onTouchEnd={handleDoubleTapLike}
          >
            <GigaSocialPostMedia
              post={post}
              allowFullView
              autoPlay={shouldAutoPlayVideo && isActiveVideo(post._id)}
              paused={feedPaused}
            />
            {heartBurst ? (
              <span
                className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
                aria-hidden
              >
                <Heart className="h-16 w-16 fill-white text-white drop-shadow-lg" />
              </span>
            ) : null}
            {/* Like + Tip on media for thumb reach (photos/videos). */}
            <div
              className="gigasocial-post-card__media-actions"
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                disabled={!sessionToken || busy}
                onClick={() => void handleLike()}
                className={cn(
                  "gigasocial-post-card__media-action",
                  liked && "gigasocial-post-card__media-action--liked"
                )}
                aria-label={liked ? "Unlike" : "Like"}
                aria-pressed={liked}
              >
                <Heart
                  className={cn("h-5 w-5", liked && "fill-current")}
                  aria-hidden
                />
                <span>{likeCount}</span>
              </button>
              {canTip ? (
                <GigaSocialTipButton
                  sessionToken={sessionToken!}
                  creatorId={post.author.userId!}
                  postId={post._id}
                  onMedia
                  disabled={busy}
                />
              ) : null}
            </div>
          </div>
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
          "gigasocial-post-card__footer bg-white",
          isVisualPost && "gigasocial-post-card__footer--visual"
        )}
      >
        {isVisualPost && (display.title || display.description || post.hashtags?.length) ? (
          <div className="gigasocial-post-card__meta px-4 pt-2">{captionBlock}</div>
        ) : null}

        <div
          className={cn(
            "gigasocial-post-card__actions flex flex-wrap items-center gap-0.5 border-t border-border",
            isVisualPost
              ? "gigasocial-post-card__actions--compact px-4 pt-2"
              : "mt-4 gap-1 pt-3"
          )}
        >
        {/* Like/Tip live on media for visual posts; keep in footer for text posts. */}
        {!isVisualPost ? (
          <ActionButton
            active={liked}
            label={String(likeCount)}
            icon={Heart}
            onClick={() => void handleLike()}
            disabled={!sessionToken || busy}
          />
        ) : null}
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
        {!isVisualPost && canTip ? (
          <GigaSocialTipButton
            sessionToken={sessionToken!}
            creatorId={post.author.userId!}
            postId={post._id}
            disabled={busy}
          />
        ) : null}
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

        {enablePostAIActions ? (
          <div className={cn(isVisualPost ? "px-4 pt-1" : "mt-2")}>
            <GigaSocialPostAIActions post={post} compact={isVisualPost} />
          </div>
        ) : null}

        {sessionToken && !isVisualPost ? (
          <div className="gigasocial-post-card__comment mt-3">
            <GigaSocialPostCommentBox
              postId={post._id}
              sessionToken={sessionToken}
              onPosted={() => setCommentsOpen(true)}
            />
          </div>
        ) : null}

        {commentsOpen && sessionToken ? (
          <div className={cn("gigasocial-post-card__thread", isVisualPost ? "px-4 pb-3 pt-2" : undefined)}>
            <GigaSocialCommentThread
              postId={post._id}
              sessionToken={sessionToken}
              hideComposer={!isVisualPost}
            />
          </div>
        ) : null}
      </div>

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
