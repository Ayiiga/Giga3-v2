"use client";

import { Button } from "@/components/ui/Button";
import type { SocialComment } from "@/lib/gigasocial/types";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Send } from "lucide-react";
import { memo, useState } from "react";
import { formatRelativeTime } from "@/lib/datetime";
import { GigaSocialPostCommentBox } from "@/components/gigasocial/GigaSocialPostCommentBox";

export const GigaSocialCommentThread = memo(function GigaSocialCommentThread({
  postId,
  sessionToken,
  hideComposer = false,
}: {
  postId: string;
  sessionToken: string;
  hideComposer?: boolean;
}) {
  const data = useQuery(api.gigaSocial.listComments, {
    postId: postId as Id<"socialPosts">,
    sessionToken,
  });
  const addComment = useMutation(api.gigaSocial.addComment);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const comments = (data?.comments ?? []) as SocialComment[];

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
            </p>
            <p className="mt-1 text-foreground">{comment.body}</p>
            <button
              type="button"
              className="mt-1 text-xs font-medium text-accent hover:underline"
              onClick={() => setReplyTo(comment._id)}
            >
              Reply
            </button>
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
