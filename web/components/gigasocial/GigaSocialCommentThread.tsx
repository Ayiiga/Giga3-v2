"use client";

import { Button } from "@/components/ui/Button";
import type { SocialComment } from "@/lib/gigasocial/types";
import { sortCommentsNewestWithPins } from "@/lib/gigasocial/postSort";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Pin, Send } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { formatRelativeTime } from "@/lib/datetime";
import { GigaSocialPostCommentBox } from "@/components/gigasocial/GigaSocialPostCommentBox";
import { getUserEmail } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const GigaSocialCommentThread = memo(function GigaSocialCommentThread({
  postId,
  sessionToken,
  postAuthorUserId,
  hideComposer = false,
}: {
  postId: string;
  sessionToken: string;
  postAuthorUserId?: string;
  hideComposer?: boolean;
}) {
  const data = useQuery(api.gigaSocial.listComments, {
    postId: postId as Id<"socialPosts">,
    sessionToken,
  });
  const addComment = useMutation(api.gigaSocial.addComment);
  const setCommentPinned = useMutation(api.gigaSocial.setCommentPinned);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [pinBusyId, setPinBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const myUserId = useMemo(() => getUserEmail(), []);
  const canPinComments = Boolean(
    myUserId && (postAuthorUserId ?? data?.postAuthorId) && myUserId === (postAuthorUserId ?? data?.postAuthorId)
  );

  const comments = useMemo(
    () => sortCommentsNewestWithPins((data?.comments ?? []) as SocialComment[]),
    [data?.comments]
  );

  async function submitReply() {
    const trimmed = replyBody.trim();
    if (!trimmed || busy || !replyTo) return;
    setBusy(true);
    setError(null);
    try {
      await addComment({
        sessionToken,
        postId: postId as Id<"socialPosts">,
        body: trimmed,
        parentId: replyTo as Id<"socialComments">,
      });
      setReplyBody("");
      setReplyTo(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post comment.");
    } finally {
      setBusy(false);
    }
  }

  async function togglePin(comment: SocialComment) {
    if (!canPinComments || pinBusyId) return;
    setPinBusyId(comment._id);
    setError(null);
    try {
      await setCommentPinned({
        sessionToken,
        commentId: comment._id as Id<"socialComments">,
        pinned: !comment.pinnedAt,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update comment pin.");
    } finally {
      setPinBusyId(null);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-border bg-white p-3">
      <ul className="space-y-3">
        {comments.length === 0 && (
          <li className="text-xs text-muted">No comments yet. Start the conversation.</li>
        )}
        {comments.map((comment) => (
          <li key={comment._id} className="text-sm">
            <p className="font-medium text-foreground">
              {comment.author.displayName}{" "}
              <span className="font-normal text-muted">
                · {formatRelativeTime(comment.createdAt)}
              </span>
              {comment.pinnedAt ? (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                  <Pin className="h-2.5 w-2.5" aria-hidden />
                  Pinned
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-foreground">{comment.body}</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="text-xs font-medium text-accent hover:underline"
                onClick={() => setReplyTo(comment._id)}
              >
                Reply
              </button>
              {canPinComments ? (
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-1 text-xs font-medium hover:underline",
                    comment.pinnedAt ? "text-accent" : "text-muted"
                  )}
                  disabled={pinBusyId === comment._id}
                  onClick={() => void togglePin(comment)}
                >
                  <Pin className="h-3 w-3" aria-hidden />
                  {comment.pinnedAt ? "Unpin" : "Pin"}
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {replyTo ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted">
            Replying…{" "}
            <button type="button" className="text-accent" onClick={() => setReplyTo(null)}>
              Cancel
            </button>
          </p>
          <div className="flex gap-2">
            <input
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write a reply…"
              aria-label="Reply text"
              className="min-h-9 flex-1 rounded-full border border-border px-3 py-1.5 text-sm"
            />
            <Button
              type="button"
              disabled={busy || !replyBody.trim()}
              onClick={() => void submitReply()}
              className="h-9 w-9 shrink-0 rounded-full p-0"
              aria-label="Post reply"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      ) : null}

      {!hideComposer ? (
        <GigaSocialPostCommentBox postId={postId} sessionToken={sessionToken} />
      ) : null}

      {error ? (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});
