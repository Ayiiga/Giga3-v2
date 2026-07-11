"use client";

import { Button } from "@/components/ui/Button";
import { SOCIAL_CAPTION_MAX_LENGTH } from "@/lib/gigasocial/constants";
import { extractHashtagsFromText, formatCompactHashtags } from "@/lib/gigasocial/hashtags";
import { POST_TYPE_OPTIONS, type SocialPostTypeId } from "@/lib/gigasocial/sections";
import type { SocialPost } from "@/lib/gigasocial/types";
import { X } from "lucide-react";
import { memo, useState } from "react";

export const GigaSocialPostEditor = memo(function GigaSocialPostEditor({
  post,
  onClose,
  onSave,
}: {
  post: SocialPost;
  onClose: () => void;
  onSave: (args: { body: string; postType: SocialPostTypeId }) => Promise<void>;
}) {
  const [body, setBody] = useState(post.body);
  const [postType, setPostType] = useState<SocialPostTypeId>(post.postType);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hashtags = extractHashtagsFromText(body);

  async function handleSave() {
    if (!body.trim()) {
      setError("Caption cannot be empty.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave({ body: body.trim(), postType });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save changes.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-accent/20 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Edit post</h3>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-zinc-100"
          aria-label="Close editor"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={SOCIAL_CAPTION_MAX_LENGTH}
        rows={6}
        className="w-full resize-y rounded-xl border border-border bg-white px-3 py-2 text-sm"
        placeholder="Update your caption…"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {POST_TYPE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setPostType(option.id)}
            className={`min-h-8 rounded-full border px-3 text-xs font-medium ${
              postType === option.id
                ? "border-accent/40 bg-accent/10 text-foreground"
                : "border-border text-muted"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {hashtags.length > 0 ? (
        <p className="mt-2 truncate text-[11px] text-muted">
          Hashtags: {formatCompactHashtags(hashtags, 5)}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="outline" className="min-h-10" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="button" className="min-h-10" onClick={() => void handleSave()} disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
});
