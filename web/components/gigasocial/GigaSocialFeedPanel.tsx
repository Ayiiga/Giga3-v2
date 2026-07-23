"use client";

import type { GigaCreateLaunch } from "@/components/gigasocial/create/GigaCreateButton";
import { GigaCreateButton } from "@/components/gigasocial/create/GigaCreateButton";
import type { GigaCreateActionId } from "@/components/gigasocial/create/gigaCreateMenu";
import { GigaSocialStoriesBarWithLive } from "@/components/gigasocial/stories/GigaSocialStoriesBarWithLive";
import { DataSaverControl } from "@/components/gigasocial/feed/DataSaverControl";
import { FeedCategoryBar } from "@/components/gigasocial/feed/FeedCategoryBar";
import { FeedVideoPlaybackProvider } from "@/components/gigasocial/feed/FeedVideoPlaybackProvider";
import { GigaSocialSearchBar } from "@/components/gigasocial/feed/GigaSocialSearchBar";
import { FeedSkeletonList } from "@/components/gigasocial/feed/FeedPostSkeleton";
import { LazyFeedItem } from "@/components/gigasocial/feed/LazyFeedItem";
import { GigaSocialPanelErrorBoundary } from "@/components/gigasocial/GigaSocialPanelErrorBoundary";
import { withChunkRetryLoader } from "@/lib/pwa/dynamicWithChunkRetry";
import { GigaSocialFeaturedPlayer } from "@/components/gigasocial/GigaSocialFeaturedPlayer";
import { GigaSocialFeedHero } from "@/components/gigasocial/GigaSocialFeedHero";
import { GigaSocialPostCard } from "@/components/gigasocial/GigaSocialPostCard";
import type { AIStudioLaunch } from "@/components/gigasocial/studio/GigaSocialAIStudioHub";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SocialEmptyState } from "@/components/gigasocial/ux/SocialEmptyState";
import { useConnectionQuality } from "@/hooks/useConnectionQuality";
import { useGigaSocialFeedAutoplay } from "@/hooks/useGigaSocialFeedAutoplay";
import { useEffectiveOnline } from "@/hooks/useEffectiveOnline";
import { useGigaSocialOutbox } from "@/hooks/useGigaSocialOutbox";
import {
  feedCategoryNeedsFollowingFeed,
  feedCategoryNeedsSavedFeed,
  filterPostsByFeedCategory,
  type FeedCategoryId,
} from "@/lib/gigasocial/feedCategories";
import type { FeedRankingContext } from "@/lib/gigasocial/feedRanking";
import { rememberSearch } from "@/lib/gigasocial/searchStorage";
import { resolveGigaCreateRoute } from "@/lib/gigasocial/gigaCreateRoutes";
import { primeCameraStream } from "@/lib/gigasocial/cameraCapture";
import { useGigaSocialFeatures } from "@/lib/gigasocial/featureFlags";
import { handleFromEmail } from "@/lib/gigasocial/handleFromEmail";
import { findFeaturedMediaPost, getPostMediaKind } from "@/lib/gigasocial/postMedia";
import { loadFeedSnapshot, saveFeedSnapshot } from "@/lib/gigasocial/feedOfflineSnapshot";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import type { SocialPostMediaItemInput } from "@/lib/gigasocial/constants";
import { POST_TYPE_OPTIONS, type SocialPostTypeId } from "@/lib/gigasocial/sections";
import type { SocialPost } from "@/lib/gigasocial/types";
import { useMutation, useQuery } from "convex/react";
import { getUserEmail } from "@/lib/auth";
import { GigaSocialAccountSwitcher } from "@/components/gigasocial/accounts/GigaSocialAccountSwitcher";
import {
  resolveActiveSocialAccount,
  type SocialAccountSummary,
} from "@/lib/gigasocial/activeSocialAccount";
import { MessageCircle, SquarePen, X } from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

const GigaSocialAIStudioHub = dynamic(
  () =>
    import("@/components/gigasocial/studio/GigaSocialAIStudioHub").then((m) => ({
      default: m.GigaSocialAIStudioHub,
    })),
  { ssr: false }
);

const GigaSocialComposer = dynamic(
  withChunkRetryLoader(() =>
    import("@/components/gigasocial/GigaSocialComposer").then((m) => ({
      default: m.GigaSocialComposer,
    }))
  ),
  { ssr: false }
);

const GigaSocialComposerSheet = dynamic(
  withChunkRetryLoader(() =>
    import("@/components/gigasocial/GigaSocialComposerSheet").then((m) => ({
      default: m.GigaSocialComposerSheet,
    }))
  ),
  { ssr: false }
);

export const GigaSocialFeedPanel = memo(function GigaSocialFeedPanel({
  sessionToken,
  communitySlug,
  highlightPostId,
  onOpenLive,
  autoOpenStories = false,
  autoOpenStoriesRing,
}: {
  sessionToken: string | null;
  communitySlug?: string;
  highlightPostId?: string;
  onOpenLive?: () => void;
  autoOpenStories?: boolean;
  autoOpenStoriesRing?: string;
}) {
  const router = useRouter();
  const features = useGigaSocialFeatures();
  const { effectiveOnline } = useEffectiveOnline();
  const { isSlowNetwork } = useConnectionQuality();
  const socialOutbox = useGigaSocialOutbox(sessionToken, features.enableSocialOutbox);
  const [offlineSnapshot, setOfflineSnapshot] = useState<SocialPost[] | null>(() =>
    typeof window !== "undefined" ? loadFeedSnapshot() : null
  );
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [extraPosts, setExtraPosts] = useState<SocialPost[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [aiStudioOpen, setAiStudioOpen] = useState(false);
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
  const [featuredReplayKey, setFeaturedReplayKey] = useState(0);
  const highlightScrolledRef = useRef<string | null>(null);
  const featuredInitializedRef = useRef(false);
  const userPickedFeaturedRef = useRef(false);

  const followingFeed = feedCategoryNeedsFollowingFeed(feedCategory);
  const savedFeed = feedCategoryNeedsSavedFeed(feedCategory);

  const feed = useQuery(
    api.gigaSocial.listFeed,
    savedFeed || !effectiveOnline
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
    savedFeed && sessionToken && effectiveOnline ? { sessionToken } : "skip"
  );

  const searchResults = useQuery(
    api.gigaSocial.listDiscover,
    debouncedSearch.trim() && effectiveOnline
      ? {
          sessionToken: sessionToken ?? undefined,
          query: debouncedSearch.trim(),
          filter: "recent",
          limit: 24,
        }
      : "skip"
  );

  const myHandle = useMemo(() => handleFromEmail(getUserEmail()), []);
  const accountsQuery = useQuery(
    api.gigaSocial.listMySocialAccounts,
    sessionToken && effectiveOnline ? { sessionToken } : "skip"
  );
  const accounts = useMemo(
    () => (accountsQuery?.accounts ?? []) as SocialAccountSummary[],
    [accountsQuery?.accounts]
  );

  useEffect(() => {
    if (!accounts.length) return;
    const active = resolveActiveSocialAccount(accounts);
    setActiveProfileId(active?.profileId ?? null);
  }, [accounts]);

  const createPost = useMutation(api.gigaSocial.createPost);
  const updatePost = useMutation(api.gigaSocial.updatePost);
  const toggleLike = useMutation(api.gigaSocial.toggleLike);
  const toggleBookmark = useMutation(api.gigaSocial.toggleBookmark);
  const recordShare = useMutation(api.gigaSocial.recordShare);
  const deletePost = useMutation(api.gigaSocial.deletePost);

  const searchLoading =
    Boolean(debouncedSearch.trim()) && searchResults === undefined && effectiveOnline;
  const initialFeedLoading =
    !savedFeed && !debouncedSearch.trim() && feed === undefined && effectiveOnline;
  const savedLoading = savedFeed && saved === undefined && effectiveOnline;
  const postsLoading = initialFeedLoading || savedLoading || searchLoading;
  const isSearching = Boolean(searchQuery.trim() || debouncedSearch.trim());

  useEffect(() => {
    if (!effectiveOnline) {
      setOfflineSnapshot(loadFeedSnapshot());
    }
  }, [effectiveOnline]);

  const rankingCtx = useMemo<FeedRankingContext | undefined>(() => {
    if (!features.enableIntelligentFeed) return undefined;
    return {
      isSlowNetwork,
      hourOfDay: new Date().getHours(),
      regionHint: "africa",
      interestKeywords: ["ai", "learn", "creator", "africa"],
    };
  }, [features.enableIntelligentFeed, isSlowNetwork]);

  const posts = useMemo(() => {
    const sourcePosts = savedFeed
      ? ((saved?.posts ?? []) as SocialPost[])
      : debouncedSearch.trim()
        ? searchLoading
          ? []
          : ((searchResults?.posts ?? []) as SocialPost[])
        : effectiveOnline
          ? ([...(cursor ? extraPosts : []), ...(feed?.posts ?? [])] as SocialPost[])
          : (offlineSnapshot ?? []);

    const sorted = [...sourcePosts].sort((a, b) => b.createdAt - a.createdAt);
    const typed =
      typeFilter === "all" ? sorted : sorted.filter((p) => p.postType === typeFilter);
    return features.enableFeedCategories
      ? filterPostsByFeedCategory(typed, feedCategory, rankingCtx)
      : typed;
  }, [
    cursor,
    debouncedSearch,
    extraPosts,
    feed?.posts,
    feedCategory,
    features.enableFeedCategories,
    rankingCtx,
    saved?.posts,
    savedFeed,
    searchLoading,
    searchResults?.posts,
    typeFilter,
    effectiveOnline,
    offlineSnapshot,
  ]);

  useEffect(() => {
    if (!effectiveOnline || savedFeed || debouncedSearch.trim()) return;
    const livePosts = [...(cursor ? extraPosts : []), ...(feed?.posts ?? [])] as SocialPost[];
    if (livePosts.length > 0) {
      saveFeedSnapshot(livePosts);
    }
  }, [cursor, debouncedSearch, effectiveOnline, extraPosts, feed?.posts, savedFeed]);

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
      const nextIndex =
        direction > 0
          ? baseIndex >= videoPosts.length - 1
            ? 0
            : baseIndex + 1
          : baseIndex <= 0
            ? videoPosts.length - 1
            : baseIndex - 1;
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

  const handleFeaturedVideoEnded = useCallback(() => {
    if (videoPosts.length < 2) {
      setFeaturedReplayKey((value) => value + 1);
      return;
    }
    if (featuredVideoIndex >= 0 && featuredVideoIndex < videoPosts.length - 1) {
      goToNextFeaturedVideo();
      return;
    }
    setFeaturedReplayKey((value) => value + 1);
  }, [featuredVideoIndex, goToNextFeaturedVideo, videoPosts.length]);

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

      if (route.action === "media-camera") {
        primeCameraStream({ includeAudio: false, facing: "environment" });
      } else if (route.action === "story-content") {
        primeCameraStream({ includeAudio: true, facing: "environment" });
      }

      openComposer(route.action, null, {
        body: route.body,
        postType: route.postType,
      });
    },
    [onOpenLive, openComposer, router]
  );

  const handleAIStudioLaunch = useCallback(
    (launch: AIStudioLaunch) => {
      if (launch.kind === "toast") {
        setErrorToast(launch.message);
        return;
      }
      if (launch.kind === "navigate") {
        router.push(launch.href);
        return;
      }
      primeCameraStream({ includeAudio: true, facing: "user" });
      openComposer("media-camera", null, {
        body: launch.body,
        postType: "video",
      });
    },
    [openComposer, router]
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
    setFeaturedReplayKey(0);
  }, [featuredPost?._id]);

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
      visibility?: "public" | "followers";
      profileId?: string;
    }) => {
      if (!sessionToken) throw new Error("Sign in to post.");
      if (!effectiveOnline && features.enableSocialOutbox) {
        if (args.mediaItems?.length) {
          throw new Error("Media posts need a connection. Text-only drafts can sync offline.");
        }
        await socialOutbox.enqueue("create_post", {
          body: args.body,
          postType: args.postType,
          communitySlug: args.communitySlug,
        });
        setErrorToast("Saved offline — will publish when you're back online.");
        resetFeedPagination();
        setComposeAction(undefined);
        setRemixSource(null);
        return;
      }
      await createPost({
        sessionToken,
        body: args.body,
        postType: args.postType,
        mediaItems: args.mediaItems,
        communitySlug: args.communitySlug,
        visibility: args.visibility,
        profileId: (args.profileId ?? activeProfileId ?? undefined) as
          | Id<"socialProfiles">
          | undefined,
      });
      resetFeedPagination();
      setComposeAction(undefined);
      setRemixSource(null);
    },
    [
      activeProfileId,
      createPost,
      effectiveOnline,
      features.enableSocialOutbox,
      resetFeedPagination,
      sessionToken,
      socialOutbox,
    ]
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

  const [hideFeaturedOnMobile, setHideFeaturedOnMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => {
      setHideFeaturedOnMobile(mq.matches && !highlightPostId);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [highlightPostId]);

  const showFeaturedAboveFeed = Boolean(
    featuredPost && !isSearching && !savedFeed && !hideFeaturedOnMobile
  );

  const visibleFeedPosts =
    hideFeaturedOnMobile && featuredPost ? [featuredPost, ...feedPosts] : feedPosts;

  const composerProps = {
    sessionToken: sessionToken!,
    communitySlug,
    initialAction: composeAction,
    initialBody: composeInitialBody,
    initialPostType: composeInitialPostType,
    remixSource: remixSource ?? undefined,
    enableAIAssistant: features.enableAIEditing,
    enableMediaStudio: features.enableMediaStudio,
    profileId: activeProfileId ?? undefined,
    accounts,
    onActiveProfileChange: setActiveProfileId,
    onSubmit: handleCreate,
    onPosted: closeComposer,
  };

  return (
    <FeedVideoPlaybackProvider enabled={autoPlay && !paused}>
    <div className="gigasocial-feed-panel-compact gigasocial-stable space-y-1.5 pb-20 sm:space-y-2.5 sm:pb-24">
      {errorToast ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900" role="status">
          {errorToast}
        </p>
      ) : null}

      {!isSearching && !savedFeed ? (
        <GigaSocialStoriesBarWithLive
          sessionToken={sessionToken}
          compact
          autoOpen={autoOpenStories}
          autoOpenRingId={autoOpenStoriesRing}
        />
      ) : null}

      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <GigaSocialSearchBar value={searchQuery} onChange={setSearchQuery} sessionToken={sessionToken} />
        </div>
        {features.enableDataSaver ? <DataSaverControl className="shrink-0 pt-0.5" /> : null}
      </div>

      {socialOutbox.pendingCount > 0 ? (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs text-sky-900" role="status">
          {socialOutbox.pendingCount} offline action{socialOutbox.pendingCount === 1 ? "" : "s"} waiting to sync
        </p>
      ) : null}

      {features.enableFeedCategories ? (
        <div className="hidden sm:block">
          <FeedCategoryBar value={feedCategory} onChange={setFeedCategory} />
        </div>
      ) : null}

      <div
        className="hidden flex-wrap items-center gap-1.5 sm:flex sm:gap-2"
        role="tablist"
        aria-label="Filter feed by post type"
      >
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
        {sessionToken && !useGigaCreateFab ? (
          <button
            type="button"
            onClick={() => setComposerOpen((open) => !open)}
            className={cn(
              "ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-muted hover:border-accent/30 hover:bg-accent/5 hover:text-accent",
              composerOpen && "border-accent/40 bg-accent/10 text-accent"
            )}
            aria-label={composerOpen ? "Close new post" : "New post"}
            aria-expanded={composerOpen}
          >
            {composerOpen ? (
              <X className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <SquarePen className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
        ) : null}
      </div>

      {showFeaturedAboveFeed ? (
        hydrated ? (
          <GigaSocialFeaturedPlayer
            post={featuredPost!}
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
            onVideoEnded={handleFeaturedVideoEnded}
            replayKey={featuredReplayKey}
            compact
          />
        ) : (
          <div
            className="gigasocial-featured-slot min-h-[10rem] rounded-xl border border-accent/20 bg-card sm:min-h-[12rem]"
            aria-hidden
          />
        )
      ) : !isSearching && !savedFeed && !posts.length && !postsLoading ? (
        <GigaSocialFeedHero postCount={posts.length} compact />
      ) : null}

      {sessionToken && composerOpen && !useGigaCreateFab ? (
        <GigaSocialPanelErrorBoundary panelName="Create post">
          <GigaSocialComposer {...composerProps} />
        </GigaSocialPanelErrorBoundary>
      ) : null}

      {sessionToken && useGigaCreateFab ? (
        <GigaSocialPanelErrorBoundary panelName="Create post">
          <GigaSocialComposerSheet open={composerOpen} onClose={closeComposer} {...composerProps} />
        </GigaSocialPanelErrorBoundary>
      ) : null}

      {postsLoading ? (
        <FeedSkeletonList count={2} />
      ) : visibleFeedPosts.length === 0 ? (
        <div id="gigasocial-feed-posts">
          {features.enableDelightfulUX && !isSearching && typeFilter === "all" && !featuredPost ? (
            <SocialEmptyState
              icon={MessageCircle}
              title="No posts yet."
              description="Be the first to share something with the community. Invite friends or create a post to get started."
              primaryLabel="Create Post"
              onPrimary={() => openComposer("text-post")}
              secondaryLabel="Invite Friends"
              onSecondary={() => router.push("/gigasocial/?tab=profile")}
            />
          ) : (
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
          )}
        </div>
      ) : (
        <ul id="gigasocial-feed-posts" className="space-y-3">
          {visibleFeedPosts.map((post, index) => (
            <LazyFeedItem
              key={post._id}
              eager={index < 2}
              minHeightClass="min-h-[10rem]"
            >
              <div id={`gigasocial-post-${post._id}`}>
              <GigaSocialPostCard
                post={post}
                sessionToken={sessionToken}
                feedAutoPlay={autoPlay}
                feedPaused={paused}
                canDelete={Boolean(
                  (myHandle && post.author.handle === myHandle) ||
                    (getUserEmail() && post.author.userId === getUserEmail())
                )}
                enableRemix={features.enableGigaRemix}
                enableEdit
                enablePostAIActions={features.enablePostAIActions}
                enablePostTips={features.enablePostTips}
                onEdit={handleEditPost}
                onRemix={
                  features.enableGigaRemix
                    ? (source) => openComposer("remix", source)
                    : undefined
                }
                onLike={async (postId, liked) => {
                  if (!sessionToken) return;
                  if (!effectiveOnline && features.enableSocialOutbox) {
                    await socialOutbox.enqueue(liked ? "like" : "unlike", { postId });
                    return;
                  }
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
              </div>
            </LazyFeedItem>
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
        <GigaSocialPanelErrorBoundary panelName="Create">
          <GigaCreateButton
            disabled={!sessionToken}
            enableLive={features.enableGigaLive}
            enableAIStudio={features.enableAIStudio}
            onSelect={handleGigaCreate}
            onOpenAIStudio={() => setAiStudioOpen(true)}
          />
        </GigaSocialPanelErrorBoundary>
      ) : null}

      {features.enableAIStudio ? (
        <GigaSocialAIStudioHub
          open={aiStudioOpen}
          onClose={() => setAiStudioOpen(false)}
          onLaunch={handleAIStudioLaunch}
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
        "min-h-8 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors sm:min-h-9 sm:px-3 sm:py-1.5 sm:text-xs",
        active
          ? "border-accent/40 bg-accent/10 text-foreground"
          : "border-border bg-white text-muted hover:border-accent/25 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}
