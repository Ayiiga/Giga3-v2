"use client";

import { Button } from "@/components/ui/Button";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Send } from "lucide-react";
import { memo, useState } from "react";
import { formatRelativeTime } from "@/lib/datetime";

export const GigaSocialCommentThread = memo(function GigaSocialCommentThread({
  postId,
  sessionToken,
}: {
  postId: string;
  sessionToken: string;
}) {
  const data = useQuery(api.gigaSocial.listComments, {
    postId: postId as Id<"socialPosts">,
    sessionToken,
  });
  const addComment = useMutation(api.gigaSocial.addComment);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const comments = data?.comments ?? [];

  async function submit() {
    const trimmed = body.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      await addComment({
        sessionToken,
        postId: postId as Id<"socialPosts">,
        body: trimmed,
        parentId: replyTo ? (replyTo as Id<"socialComments">) : undefined,
      });
      setBody("");
      setReplyTo(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post comment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-white/50 p-3">
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

      {replyTo && (
        <p className="mt-2 text-xs text-muted">
          Replying…{" "}
          <button type="button" className="text-accent" onClick={() => setReplyTo(null)}>
            Cancel
          </button>
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a comment…"
          className="min-h-10 flex-1 rounded-xl border border-border px-3 py-2 text-sm"
        />
        <Button type="button" disabled={busy || !body.trim()} onClick={() => void submit()} className="min-h-10">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});
