"use client";

import type { GigaCreateLaunch } from "@/components/gigasocial/create/GigaCreateButton";
import { GigaCreateButton } from "@/components/gigasocial/create/GigaCreateButton";
import {
  getGigaCreateSections,
  type GigaCreateActionId,
} from "@/components/gigasocial/create/gigaCreateMenu";
import { GigaSocialStoriesBar } from "@/components/gigasocial/stories/GigaSocialStoriesBar";
import { FeedCategoryBar } from "@/components/gigasocial/feed/FeedCategoryBar";
import { FeedVideoPlaybackProvider } from "@/components/gigasocial/feed/FeedVideoPlaybackProvider";
import { GigaSocialSearchBar } from "@/components/gigasocial/feed/GigaSocialSearchBar";
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
  feedCategoryNeedsFollowingFeed,
  feedCategoryNeedsSavedFeed,
  filterPostsByFeedCategory,
  type FeedCategoryId,
} from "@/lib/gigasocial/feedCategories";
import { rememberSearch } from "@/lib/gigasocial/searchStorage";
import { resolveGigaCreateRoute } from "@/lib/gigasocial/gigaCreateRoutes";
import { useGigaSocialFeatures } from "@/lib/gigasocial/featureFlags";
import { handleFromEmail } from "@/lib/gigasocial/handleFromEmail";
import { findFeaturedMediaPost, getPostMediaKind } from "@/lib/gigasocial/postMedia";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import type { SocialPostMediaItemInput } from "@/lib/gigasocial/constants";
import { POST_TYPE_OPTIONS, type SocialPostTypeId } from "@/lib/gigasocial/sections";
import type { SocialPost } from "@/lib/gigasocial/types";
import { useMutation, useQuery } from "convex/react";
import { getUserEmail } from "@/lib/auth";
import { MessageCircle, SquarePen, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

export const GigaSocialFeedPanel = memo(function GigaSocialFeedPanel({
  sessionToken,
  communitySlug,
  highlightPostId,
  onOpenLive,
  autoOpenStories = false,
}: {
  sessionToken: string | null;
  communitySlug?: string;
  highlightPostId?: string;
  onOpenLive?: () => void;
  autoOpenStories?: boolean;
}) {
  const router = useRouter();
  const features = useGigaSocialFeatures();
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [extraPosts, setExtraPosts] = useState<SocialPost[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | SocialPostTypeId>("all");
  const [feedCategory, setFeedCategory] = useState<FeedCategoryId>("for-you");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [composeAction, setComposeAction] = useState<GigaCreateActionId | undefined>();
  const [composeInitialBody, setComposeInitialBody] = useState<string | undefined>();
  const [composeInitialPostType, setComposeInitialPostType] = useState<
    SocialPostTypeId | undefined
  >();
  const [remixSource, setRemixSource] = useState<SocialPost | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [activeFeaturedVideoId, setActiveFeaturedVideoId] = useState<string | null>(null);
  const highlightScrolledRef = useRef<string | null>(null);
  const featuredInitializedRef = useRef(false);
  const userPickedFeaturedRef = useRef(false);

  const followingFeed = feedCategoryNeedsFollowingFeed(feedCategory);
  const savedFeed = feedCategoryNeedsSavedFeed(feedCategory);

  const feed = useQuery(
    api.gigaSocial.listFeed,
    savedFeed
      ? "skip"
      : {
          sessionToken: sessionToken ?? undefined,
          communitySlug,
          followingOnly: followingFeed || undefined,
          cursor,
          limit: 15,
        }
  );

  const saved = useQuery(
    api.gigaSocial.listBookmarks,
    savedFeed && sessionToken ? { sessionToken } : "skip"
  );

  const searchResults = useQuery(
    api.gigaSocial.listDiscover,
    debouncedSearch.trim()
      ? {
          sessionToken: sessionToken ?? undefined,
          query: debouncedSearch.trim(),
          filter: "recent",
          limit: 24,
        }
      : "skip"
  );

  const myHandle = useMemo(() => handleFromEmail(getUserEmail()), []);

  const createPost = useMutation(api.gigaSocial.createPost);
  const updatePost = useMutation(api.gigaSocial.updatePost);
  const toggleLike = useMutation(api.gigaSocial.toggleLike);
  const toggleBookmark = useMutation(api.gigaSocial.toggleBookmark);
  const recordShare = useMutation(api.gigaSocial.recordShare);
  const deletePost = useMutation(api.gigaSocial.deletePost);

  const searchLoading = Boolean(debouncedSearch.trim()) && searchResults === undefined;
  const initialFeedLoading = !savedFeed && !debouncedSearch.trim() && feed === undefined;
  const savedLoading = savedFeed && saved === undefined;
  const postsLoading = initialFeedLoading || savedLoading || searchLoading;
  const isSearching = Boolean(searchQuery.trim() || debouncedSearch.trim());

  const posts = useMemo(() => {
    const sourcePosts = savedFeed
      ? ((saved?.posts ?? []) as SocialPost[])
      : debouncedSearch.trim()
        ? searchLoading
          ? []
          : ((searchResults?.posts ?? []) as SocialPost[])
        : ([...(cursor ? extraPosts : []), ...(feed?.posts ?? [])] as SocialPost[]);

    const sorted = [...sourcePosts].sort((a, b) => b.createdAt - a.createdAt);
    const typed =
      typeFilter === "all" ? sorted : sorted.filter((p) => p.postType === typeFilter);
    return features.enableFeedCategories
      ? filterPostsByFeedCategory(typed, feedCategory)
      : typed;
  }, [
    cursor,
    debouncedSearch,
    extraPosts,
    feed?.posts,
    feedCategory,
    features.enableFeedCategories,
    saved?.posts,
    savedFeed,
    searchLoading,
    searchResults?.posts,
    typeFilter,
  ]);

  const { autoPlay, paused, pause, toggle, hydrated } = useGigaSocialFeedAutoplay();

  const videoPosts = useMemo(
    () => posts.filter((post) => getPostMediaKind(post) === "video"),
    [posts]
  );

  const featuredPost = useMemo(() => {
    if (activeFeaturedVideoId) {
      const selected = videoPosts.find((post) => post._id === activeFeaturedVideoId);
      if (selected) return selected;
    }
    const fallback = findFeaturedMediaPost(posts, highlightPostId);
    if (fallback && getPostMediaKind(fallback) === "video") return fallback;
    return videoPosts[0] ?? fallback;
  }, [activeFeaturedVideoId, highlightPostId, posts, videoPosts]);

  const featuredVideoIndex = useMemo(() => {
    if (!featuredPost) return -1;
    return videoPosts.findIndex((post) => post._id === featuredPost._id);
  }, [featuredPost, videoPosts]);

  const skipFeaturedVideo = useCallback(
    (direction: 1 | -1) => {
      if (videoPosts.length < 2) return;
      const currentIndex =
        featuredVideoIndex >= 0
          ? featuredVideoIndex
          : videoPosts.findIndex((post) => post._id === featuredPost?._id);
      const baseIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex = Math.min(
        videoPosts.length - 1,
        Math.max(0, baseIndex + direction)
      );
      const nextPost = videoPosts[nextIndex];
      if (nextPost) {
        userPickedFeaturedRef.current = true;
        setActiveFeaturedVideoId(nextPost._id);
      }
    },
    [featuredPost?._id, featuredVideoIndex, videoPosts]
  );

  const goToNextFeaturedVideo = useCallback(() => {
    skipFeaturedVideo(1);
  }, [skipFeaturedVideo]);

  const goToPreviousFeaturedVideo = useCallback(() => {
    skipFeaturedVideo(-1);
  }, [skipFeaturedVideo]);

  const createMenuSections = useMemo(
    () => getGigaCreateSections({ enableLive: features.enableGigaLive }),
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

  const openComposer = useCallback(
    (
      action?: GigaCreateActionId,
      source?: SocialPost | null,
      options?: { body?: string; postType?: SocialPostTypeId }
    ) => {
      setComposeAction(action);
      setComposeInitialBody(options?.body);
      setComposeInitialPostType(options?.postType);
      setRemixSource(source ?? null);
      setComposerOpen(true);
      setErrorToast(null);
    },
    []
  );

  const closeComposer = useCallback(() => {
    setComposerOpen(false);
    setComposeAction(undefined);
    setComposeInitialBody(undefined);
    setComposeInitialPostType(undefined);
    setRemixSource(null);
  }, []);

  const handleGigaCreate = useCallback(
    (launch: GigaCreateLaunch) => {
      const route = resolveGigaCreateRoute(launch.action);

      if (route.kind === "navigate") {
        router.push(route.href);
        return;
      }

      if (route.kind === "toast") {
        setErrorToast(route.message);
        if (launch.action === "remix") {
          queueMicrotask(() => {
            const behavior = window.matchMedia("(max-width: 1023px)").matches ? "auto" : "smooth";
            document.getElementById("gigasocial-feed-posts")?.scrollIntoView({
              behavior,
              block: "start",
            });
          });
        }
        return;
      }

      if (route.action === "live-content") {
        if (onOpenLive) {
          onOpenLive();
          return;
        }
        setErrorToast("Open the Live tab to start streaming.");
        return;
      }

      openComposer(route.action, null, {
        body: route.body,
        postType: route.postType,
      });
    },
    [onOpenLive, openComposer, router]
  );

  useEffect(() => {
    if (!errorToast) return;
    const timer = window.setTimeout(() => setErrorToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [errorToast]);

  useEffect(() => {
    resetFeedPagination();
    setActiveFeaturedVideoId(null);
    featuredInitializedRef.current = false;
    userPickedFeaturedRef.current = false;
  }, [communitySlug, feedCategory, resetFeedPagination]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery), 280);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedSearch.trim()) rememberSearch(debouncedSearch.trim());
  }, [debouncedSearch]);

  useEffect(() => {
    if (!posts.length) {
      setActiveFeaturedVideoId(null);
      featuredInitializedRef.current = false;
      userPickedFeaturedRef.current = false;
      return;
    }

    if (highlightPostId) {
      const preferred = findFeaturedMediaPost(posts, highlightPostId);
      if (preferred && getPostMediaKind(preferred) === "video") {
        setActiveFeaturedVideoId(preferred._id);
        featuredInitializedRef.current = true;
        return;
      }
    }

    if (userPickedFeaturedRef.current || featuredInitializedRef.current) {
      setActiveFeaturedVideoId((current) => {
        if (current && videoPosts.some((post) => post._id === current)) {
          return current;
        }
        userPickedFeaturedRef.current = false;
        featuredInitializedRef.current = false;
        return null;
      });
      return;
    }

    const initial =
      videoPosts[0] ?? findFeaturedMediaPost(posts, highlightPostId);
    if (initial && getPostMediaKind(initial) === "video") {
      setActiveFeaturedVideoId(initial._id);
      featuredInitializedRef.current = true;
    }
  }, [highlightPostId, posts, videoPosts]);

  useEffect(() => {
    if (!highlightPostId || !posts.length) return;
    if (highlightScrolledRef.current === highlightPostId) return;
    const el = document.getElementById(`gigasocial-post-${highlightPostId}`);
    if (!el) return;
    highlightScrolledRef.current = highlightPostId;
    const behavior = window.matchMedia("(max-width: 1023px)").matches ? "auto" : "smooth";
    el.scrollIntoView({ behavior, block: "center" });
  }, [highlightPostId, posts.length]);

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

  const useGigaCreateFab = features.enableGigaCreate && Boolean(sessionToken);

  const composerProps = {
    sessionToken: sessionToken!,
    communitySlug,
    initialAction: composeAction,
    initialBody: composeInitialBody,
    initialPostType: composeInitialPostType,
    remixSource: remixSource ?? undefined,
    enableAIAssistant: features.enableAIEditing,
    enableMediaStudio: features.enableMediaStudio,
    onSubmit: handleCreate,
    onPosted: closeComposer,
  };

  return (
    <FeedVideoPlaybackProvider enabled={autoPlay && !paused}>
    <div className="gigasocial-stable space-y-4 pb-24">
      {errorToast ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
          {errorToast}
        </p>
      ) : null}

      <GigaSocialSearchBar value={searchQuery} onChange={setSearchQuery} sessionToken={sessionToken} />

      {!isSearching && !savedFeed ? (
        <GigaSocialStoriesBar sessionToken={sessionToken} autoOpen={autoOpenStories} />
      ) : null}

      {featuredPost && !isSearching && !savedFeed ? (
        hydrated ? (
          <GigaSocialFeaturedPlayer
            post={featuredPost}
            autoPlay={autoPlay}
            paused={paused}
            sessionToken={sessionToken}
            onPause={pause}
            onTogglePause={toggle}
            enableSwipeSkip={getPostMediaKind(featuredPost) === "video" && videoPosts.length > 1}
            onSkipNext={
              getPostMediaKind(featuredPost) === "video" ? goToNextFeaturedVideo : undefined
            }
            onSkipPrevious={
              getPostMediaKind(featuredPost) === "video" ? goToPreviousFeaturedVideo : undefined
            }
          />
        ) : (
          <div
            className="gigasocial-featured-slot min-h-[14rem] rounded-2xl border border-accent/20 bg-card sm:min-h-[16rem]"
            aria-hidden
          />
        )
      ) : !isSearching && !savedFeed ? (
        <GigaSocialFeedHero postCount={posts.length} />
      ) : null}

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

      {postsLoading ? (
        <FeedSkeletonList count={3} />
      ) : feedPosts.length === 0 ? (
        <div id="gigasocial-feed-posts">
          <EmptyState
          icon={MessageCircle}
          title={
            isSearching
              ? "No matching posts"
              : typeFilter === "all"
                ? "No posts yet"
                : `No ${typeFilter} posts yet`
          }
          description={
            isSearching
              ? "Try different keywords or browse creators in the search dropdown."
              : typeFilter === "all"
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
            <li key={post._id} id={`gigasocial-post-${post._id}`} className="gigasocial-feed-item">
              <GigaSocialPostCard
                post={post}
                sessionToken={sessionToken}
                feedAutoPlay={autoPlay}
                feedPaused={paused}
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

      {feed?.nextCursor && !savedFeed && !debouncedSearch.trim() ? (
        <div className="flex justify-center">
          <Button type="button" variant="outline" onClick={loadMore} className="min-h-11">
            Load more
          </Button>
        </div>
      ) : null}

      {useGigaCreateFab ? (
        <GigaCreateButton
          disabled={!sessionToken}
          sections={createMenuSections}
          enableLive={features.enableGigaLive}
          onSelect={handleGigaCreate}
        />
      ) : null}
    </div>
    </FeedVideoPlaybackProvider>
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
