"use client";

import { useEffectiveOnline } from "@/hooks/useEffectiveOnline";
import {
  bumpSocialOutboxAttempt,
  enqueueSocialOutbox,
  listSocialOutbox,
  registerSocialOutboxSync,
  removeSocialOutbox,
  type SocialOutboxAction,
  type SocialOutboxEntry,
} from "@/lib/gigasocial/socialOutbox";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useState } from "react";

const MAX_ATTEMPTS = 8;

export function useGigaSocialOutbox(sessionToken: string | null, enabled: boolean) {
  const { effectiveOnline } = useEffectiveOnline();
  const [pendingCount, setPendingCount] = useState(0);
  const toggleLike = useMutation(api.gigaSocial.toggleLike);
  const addComment = useMutation(api.gigaSocial.addComment);
  const toggleFan = useMutation(api.gigaSocial.toggleFan);
  const createPost = useMutation(api.gigaSocial.createPost);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setPendingCount(0);
      return;
    }
    try {
      const rows = await listSocialOutbox();
      setPendingCount(rows.length);
    } catch {
      setPendingCount(0);
    }
  }, [enabled]);

  const enqueue = useCallback(
    async (
      action: SocialOutboxAction,
      payload: Omit<SocialOutboxEntry, "id" | "action" | "attempts" | "createdAt">
    ) => {
      if (!enabled) return null;
      const entry = await enqueueSocialOutbox({ action, ...payload });
      registerSocialOutboxSync();
      await refresh();
      return entry;
    },
    [enabled, refresh]
  );

  const flush = useCallback(async () => {
    if (!enabled || !sessionToken || !effectiveOnline) return;
    const rows = await listSocialOutbox();
    for (const row of rows) {
      if (row.attempts >= MAX_ATTEMPTS) {
        await removeSocialOutbox(row.id);
        continue;
      }
      try {
        if (row.action === "like" || row.action === "unlike") {
          if (!row.postId) throw new Error("Missing postId");
          await toggleLike({
            sessionToken,
            postId: row.postId as Id<"socialPosts">,
          });
        } else if (row.action === "comment") {
          if (!row.postId || !row.body) throw new Error("Missing comment");
          await addComment({
            sessionToken,
            postId: row.postId as Id<"socialPosts">,
            body: row.body,
          });
        } else if (row.action === "follow" || row.action === "unfollow") {
          if (!row.creatorId) throw new Error("Missing creatorId");
          await toggleFan({
            sessionToken,
            creatorId: row.creatorId,
          });
        } else if (row.action === "create_post") {
          if (!row.body || !row.postType) throw new Error("Missing post");
          await createPost({
            sessionToken,
            body: row.body,
            postType: row.postType as
              | "text"
              | "image"
              | "video"
              | "ai"
              | "education"
              | "creator",
            communitySlug: row.communitySlug,
          });
        }
        await removeSocialOutbox(row.id);
      } catch (error) {
        await bumpSocialOutboxAttempt(
          row.id,
          error instanceof Error ? error.message : "Sync failed"
        );
      }
    }
    await refresh();
  }, [
    addComment,
    createPost,
    effectiveOnline,
    enabled,
    refresh,
    sessionToken,
    toggleFan,
    toggleLike,
  ]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled || !effectiveOnline) return;
    void flush();
  }, [effectiveOnline, enabled, flush]);

  return { pendingCount, enqueue, flush, refresh };
}
