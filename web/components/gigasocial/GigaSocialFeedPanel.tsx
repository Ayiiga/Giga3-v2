"use client";

import { GigaSocialComposer } from "@/components/gigasocial/GigaSocialComposer";
import { GigaSocialPostCard } from "@/components/gigasocial/GigaSocialPostCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import type { SocialPost } from "@/lib/gigasocial/types";
import { useMutation, useQuery } from "convex/react";
import { MessageCircle } from "lucide-react";
import { memo, useCallback, useState } from "react";

export const GigaSocialFeedPanel = memo(function GigaSocialFeedPanel({
  sessionToken,
  communitySlug,
}: {
  sessionToken: string | null;
  communitySlug?: string;
}) {
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [extraPosts, setExtraPosts] = useState<SocialPost[]>([]);

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

  const posts = [...(cursor ? extraPosts : []), ...(feed?.posts ?? [])] as SocialPost[];

  const handleCreate = useCallback(
    async (args: {
      body: string;
      postType: "text" | "image" | "ai" | "education" | "creator";
      mediaUrl?: string;
      communitySlug?: string;
    }) => {
      if (!sessionToken) throw new Error("Sign in to post.");
      await createPost({
        sessionToken,
        body: args.body,
        postType: args.postType,
        mediaUrl: args.mediaUrl,
        communitySlug: args.communitySlug,
      });
    },
    [createPost, sessionToken]
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
      {sessionToken && (
        <GigaSocialComposer
          communitySlug={communitySlug}
          onSubmit={handleCreate}
        />
      )}

      {posts.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="No posts yet"
          description="Be the first to share something with the community."
        />
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => (
            <li key={post._id}>
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
