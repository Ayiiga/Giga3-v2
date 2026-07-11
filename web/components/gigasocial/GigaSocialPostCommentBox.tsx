"use client";

import { Button } from "@/components/ui/Button";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Loader2, Send } from "lucide-react";
import { memo, useState } from "react";

export const GigaSocialPostCommentBox = memo(function GigaSocialPostCommentBox({
  postId,
  sessionToken,
  compact = false,
  placeholder = "Write a comment…",
  onPosted,
}: {
  postId: string;
  sessionToken: string;
  compact?: boolean;
  placeholder?: string;
  onPosted?: () => void;
}) {
  const addComment = useMutation(api.gigaSocial.addComment);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      });
      setBody("");
      onPosted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post comment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gigasocial-post-comment-box">
      <div className={compact ? "flex gap-2" : "mt-3 flex gap-2"}>
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder={placeholder}
          aria-label="Comment text"
          className={
            compact
              ? "min-h-9 flex-1 rounded-full border border-border bg-white px-3 py-1.5 text-sm"
              : "min-h-10 flex-1 rounded-xl border border-border px-3 py-2 text-sm"
          }
        />
        <Button
          type="button"
          disabled={busy || !body.trim()}
          onClick={() => void submit()}
          className={compact ? "h-9 w-9 shrink-0 rounded-full p-0" : "min-h-10"}
          aria-label="Post comment"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});
