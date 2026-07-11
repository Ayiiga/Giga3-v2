"use client";

import type { GigaCreateLaunch } from "@/components/gigasocial/create/GigaCreateButton";
import { GigaCreateButton } from "@/components/gigasocial/create/GigaCreateButton";
import {
  GIGA_CREATE_MENU,
  type GigaCreateActionId,
} from "@/components/gigasocial/create/gigaCreateMenu";
import { FeedCategoryBar } from "@/components/gigasocial/feed/FeedCategoryBar";
import { FeedSkeletonList } from "@/components/gigasocial/feed/FeedPostSkeleton";
import { GigaSocialComposer } from "@/components/gigasocial/GigaSocialComposer";
import { GigaSocialComposerSheet } from "@/components/gigasocial/GigaSocialComposerSheet";
import { GigaSocialFeaturedPlayer } from "@/components/gigasocial/GigaSocialFeaturedPlayer";
import { GigaSocialFeedHero } from "@/components/gigasocial/GigaSocialFeedHero";
import { GigaSocialPostCard } from "@/components/gigasocial/GigaSocialPostCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useGigaSocialFeedAutoplay } from "@/hooks/useGigaSocialFeedAutoplay";
import {
  filterPostsByFeedCategory,
  type FeedCategoryId,
} from "@/lib/gigasocial/feedCategories";
import { getGigaSocialFeatures } from "@/lib/gigasocial/featureFlags";
import { handleFromEmail } from "@/lib/gigasocial/handleFromEmail";
import { findFeaturedMediaPost } from "@/lib/gigasocial/postMedia";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import type { SocialPostMediaItemInput } from "@/lib/gigasocial/constants";
import { POST_TYPE_OPTIONS, type SocialPostTypeId } from "@/lib/gigasocial/sections";
import type { SocialPost } from "@/lib/gigasocial/types";
import { useMutation, useQuery } from "convex/react";
import { getUserEmail } from "@/lib/auth";
import { MessageCircle, SquarePen, X } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

export const GigaSocialFeedPanel = memo(function GigaSocialFeedPanel({
  sessionToken,
  communitySlug,
  highlightPostId,
  onOpenLive,
}: {
  sessionToken: string | null;
  communitySlug?: string;
  highlightPostId?: string;
  onOpenLive?: () => void;
}) {
  const features = useMemo(() => getGigaSocialFeatures(), []);
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [extraPosts, setExtraPosts] = useState<SocialPost[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | SocialPostTypeId>("all");
  const [feedCategory, setFeedCategory] = useState<FeedCategoryId>("for-you");
  const [composeAction, setComposeAction] = useState<GigaCreateActionId | undefined>();
  const [remixSource, setRemixSource] = useState<SocialPost | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const feed = useQuery(api.gigaSocial.listFeed, {
    sessionToken: sessionToken ?? undefined,
    communitySlug,
    cursor,
    limit: 15,
  });

  const myHandle = useMemo(() => handleFromEmail(getUserEmail()), []);

  const createPost = useMutation(api.gigaSocial.createPost);
  const updatePost = useMutation(api.gigaSocial.updatePost);
  const toggleLike = useMutation(api.gigaSocial.toggleLike);
  const toggleBookmark = useMutation(api.gigaSocial.toggleBookmark);
  const recordShare = useMutation(api.gigaSocial.recordShare);
  const deletePost = useMutation(api.gigaSocial.deletePost);

  const posts = useMemo(() => {
    const merged = [...(cursor ? extraPosts : []), ...(feed?.posts ?? [])] as SocialPost[];
    const sorted = [...merged].sort((a, b) => b.createdAt - a.createdAt);
    const typed =
      typeFilter === "all" ? sorted : sorted.filter((p) => p.postType === typeFilter);
    return features.enableFeedCategories
      ? filterPostsByFeedCategory(typed, feedCategory)
      : typed;
  }, [cursor, extraPosts, feed?.posts, typeFilter, feedCategory, features.enableFeedCategories]);

  const { autoPlay, paused, pause, toggle, hydrated } = useGigaSocialFeedAutoplay();

  const featuredPost = useMemo(
    () => findFeaturedMediaPost(posts, highlightPostId),
    [posts, highlightPostId]
  );

  const createMenuItems = useMemo(
    () =>
      GIGA_CREATE_MENU.filter(
        (item) => item.id !== "live-content" || features.enableGigaLive
      ),
    [features.enableGigaLive]
  );

  const feedPosts = useMemo(() => {
    if (!featuredPost) return posts;
    return posts.filter((post) => post._id !== featuredPost._id);
  }, [featuredPost, posts]);

  const resetFeedPagination = useCallback(() => {
    setCursor(undefined);
    setExtraPosts([]);
  }, []);

  const openComposer = useCallback((action?: GigaCreateActionId, source?: SocialPost | null) => {
    setComposeAction(action);
    setRemixSource(source ?? null);
    setComposerOpen(true);
    setErrorToast(null);
  }, []);

  const closeComposer = useCallback(() => {
    setComposerOpen(false);
    setComposeAction(undefined);
    setRemixSource(null);
  }, []);

  const handleGigaCreate = useCallback(
    (launch: GigaCreateLaunch) => {
      if (launch.action === "live-content") {
        if (onOpenLive) {
          onOpenLive();
          return;
        }
        setErrorToast("Open the Live tab to start streaming.");
        return;
      }
      if (launch.action === "remix") {
        setErrorToast("Choose a post below and tap Remix to start a remix chain.");
        queueMicrotask(() => {
          document.getElementById("gigasocial-feed-posts")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
        return;
      }
      openComposer(launch.action);
    },
    [onOpenLive, openComposer]
  );

  useEffect(() => {
    if (!errorToast) return;
    const timer = window.setTimeout(() => setErrorToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [errorToast]);

  useEffect(() => {
    if (!highlightPostId || !posts.length) return;
    const el = document.getElementById(`gigasocial-post-${highlightPostId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightPostId, posts]);

  const handleCreate = useCallback(
    async (args: {
      body: string;
      postType: SocialPostTypeId;
      mediaItems?: SocialPostMediaItemInput[];
      communitySlug?: string;
    }) => {
      if (!sessionToken) throw new Error("Sign in to post.");
      await createPost({
        sessionToken,
        body: args.body,
        postType: args.postType,
        mediaItems: args.mediaItems,
        communitySlug: args.communitySlug,
      });
      resetFeedPagination();
      setComposeAction(undefined);
      setRemixSource(null);
    },
    [createPost, resetFeedPagination, sessionToken]
  );

  const handleEditPost = useCallback(
    async (postId: string, args: { body: string; postType: SocialPostTypeId }) => {
      if (!sessionToken) throw new Error("Sign in to edit.");
      await updatePost({
        sessionToken,
        postId: postId as Id<"socialPosts">,
        body: args.body,
        postType: args.postType,
      });
    },
    [sessionToken, updatePost]
  );

  const loadMore = useCallback(() => {
    if (!feed?.nextCursor) return;
    setExtraPosts((prev) => [...prev, ...(feed.posts as SocialPost[])]);
    setCursor(feed.nextCursor ?? undefined);
  }, [feed]);

  if (feed === undefined) {
    return <FeedSkeletonList count={3} />;
  }

  const useGigaCreateFab = features.enableGigaCreate && Boolean(sessionToken);

  const composerProps = {
    sessionToken: sessionToken!,
    communitySlug,
    initialAction: composeAction,
    remixSource: remixSource ?? undefined,
    enableAIAssistant: features.enableAIEditing,
    enableMediaStudio: features.enableMediaStudio,
    onSubmit: handleCreate,
    onPosted: closeComposer,
  };

  return (
    <div className="gigasocial-pro space-y-4 pb-24">
      {errorToast ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
          {errorToast}
        </p>
      ) : null}

      {featuredPost && hydrated ? (
        <GigaSocialFeaturedPlayer
          post={featuredPost}
          autoPlay={autoPlay}
          paused={paused}
          onPause={pause}
          onTogglePause={toggle}
        />
      ) : (
        <GigaSocialFeedHero postCount={posts.length} />
      )}

      {features.enableFeedCategories ? (
        <FeedCategoryBar value={feedCategory} onChange={setFeedCategory} />
      ) : null}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter feed by post type">
        <FilterChip active={typeFilter === "all"} onClick={() => setTypeFilter("all")} label="All" />
        {POST_TYPE_OPTIONS.filter((t) =>
          ["education", "creator", "ai", "image"].includes(t.id)
        ).map((t) => (
          <FilterChip
            key={t.id}
            active={typeFilter === t.id}
            onClick={() => setTypeFilter(t.id)}
            label={t.label}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">Latest posts</p>
        {sessionToken && !useGigaCreateFab ? (
          <button
            type="button"
            onClick={() => setComposerOpen((open) => !open)}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-muted hover:border-accent/30 hover:bg-accent/5 hover:text-accent",
              composerOpen && "border-accent/40 bg-accent/10 text-accent"
            )}
            aria-label={composerOpen ? "Close new post" : "New post"}
            aria-expanded={composerOpen}
          >
            {composerOpen ? (
              <X className="h-4 w-4" aria-hidden />
            ) : (
              <SquarePen className="h-4 w-4" aria-hidden />
            )}
          </button>
        ) : null}
      </div>

      {sessionToken && composerOpen && !useGigaCreateFab ? (
        <GigaSocialComposer {...composerProps} />
      ) : null}

      {sessionToken && useGigaCreateFab ? (
        <GigaSocialComposerSheet open={composerOpen} onClose={closeComposer} {...composerProps} />
      ) : null}

      {feedPosts.length === 0 ? (
        <div id="gigasocial-feed-posts">
          <EmptyState
          icon={MessageCircle}
          title={typeFilter === "all" ? "No posts yet" : `No ${typeFilter} posts yet`}
          description={
            typeFilter === "all"
              ? featuredPost
                ? "More posts will appear here as the community shares."
                : "Be the first to share something with the community."
              : "Try another filter or be the first to post in this category."
          }
          showVision
        />
        </div>
      ) : (
        <ul id="gigasocial-feed-posts" className="space-y-4">
          {feedPosts.map((post) => (
            <li key={post._id} id={`gigasocial-post-${post._id}`}>
              <GigaSocialPostCard
                post={post}
                sessionToken={sessionToken}
                canDelete={Boolean(myHandle && post.author.handle === myHandle)}
                enableRemix={features.enableGigaRemix}
                enableEdit={features.enableAIEditing}
                onEdit={handleEditPost}
                onRemix={
                  features.enableGigaRemix
                    ? (source) => openComposer("remix", source)
                    : undefined
                }
                onLike={async (postId) => {
                  if (!sessionToken) return;
                  await toggleLike({
                    sessionToken,
                    postId: postId as Id<"socialPosts">,
                  });
                }}
                onBookmark={async (postId) => {
                  if (!sessionToken) return;
                  await toggleBookmark({
                    sessionToken,
                    postId: postId as Id<"socialPosts">,
                  });
                }}
                onShare={async (postId) => {
                  if (!sessionToken) return;
                  await recordShare({
                    sessionToken,
                    postId: postId as Id<"socialPosts">,
                  });
                }}
                onDelete={async (postId) => {
                  if (!sessionToken) return;
                  await deletePost({
                    sessionToken,
                    postId: postId as Id<"socialPosts">,
                  });
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {feed.nextCursor && (
        <div className="flex justify-center">
          <Button type="button" variant="outline" onClick={loadMore} className="min-h-11">
            Load more
          </Button>
        </div>
      )}

      {useGigaCreateFab ? (
        <GigaCreateButton
          disabled={!sessionToken}
          menuItems={createMenuItems}
          onSelect={handleGigaCreate}
        />
      ) : null}
    </div>
  );
});

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-accent/40 bg-accent/10 text-foreground"
          : "border-border bg-white text-muted hover:border-accent/25 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}
