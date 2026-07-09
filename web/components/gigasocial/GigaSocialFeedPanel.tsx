"use client";

import { GigaSocialComposer } from "@/components/gigasocial/GigaSocialComposer";
import { GigaSocialPostCard } from "@/components/gigasocial/GigaSocialPostCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import type { SocialPostMediaItemInput } from "@/lib/gigasocial/constants";
import type { SocialPostTypeId } from "@/lib/gigasocial/sections";
import type { SocialPost } from "@/lib/gigasocial/types";
import { useMutation, useQuery } from "convex/react";
import { MessageCircle, SquarePen, X } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

export const GigaSocialFeedPanel = memo(function GigaSocialFeedPanel({
  sessionToken,
  communitySlug,
  highlightPostId,
}: {
  sessionToken: string | null;
  communitySlug?: string;
  highlightPostId?: string;
}) {
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [extraPosts, setExtraPosts] = useState<SocialPost[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);

  const feed = useQuery(api.gigaSocial.listFeed, {
    sessionToken: sessionToken ?? undefined,
    communitySlug,
    cursor,
    limit: 15,
  });

  const createPost = useMutation(api.gigaSocial.createPost);
  const toggleLike = useMutation(api.gigaSocial.toggleLike);
  const toggleBookmark = useMutation(api.gigaSocial.toggleBookmark);
  const recordShare = useMutation(api.gigaSocial.recordShare);
  const deletePost = useMutation(api.gigaSocial.deletePost);

  const posts = useMemo(() => {
    const merged = [...(cursor ? extraPosts : []), ...(feed?.posts ?? [])] as SocialPost[];
    return [...merged].sort((a, b) => b.createdAt - a.createdAt);
  }, [cursor, extraPosts, feed?.posts]);

  const resetFeedPagination = useCallback(() => {
    setCursor(undefined);
    setExtraPosts([]);
  }, []);

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
    },
    [createPost, resetFeedPagination, sessionToken]
  );

  const loadMore = useCallback(() => {
    if (!feed?.nextCursor) return;
    setExtraPosts((prev) => [...prev, ...(feed.posts as SocialPost[])]);
    setCursor(feed.nextCursor ?? undefined);
  }, [feed]);

  if (feed === undefined) {
    return <LoadingState label="Loading feed…" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">Latest posts</p>
        {sessionToken ? (
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

      {sessionToken && composerOpen ? (
        <GigaSocialComposer
          sessionToken={sessionToken}
          communitySlug={communitySlug}
          onSubmit={handleCreate}
          onPosted={() => setComposerOpen(false)}
        />
      ) : null}

      {posts.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="No posts yet"
          description="Be the first to share something with the community."
        />
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => (
            <li key={post._id} id={`gigasocial-post-${post._id}`}>
              <GigaSocialPostCard
                post={post}
                sessionToken={sessionToken}
                canDelete={false}
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
    </div>
  );
});
