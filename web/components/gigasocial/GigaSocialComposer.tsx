"use client";

import { Button } from "@/components/ui/Button";
import { POST_TYPE_OPTIONS, type SocialPostTypeId } from "@/lib/gigasocial/sections";
import { Loader2, Send } from "lucide-react";
import { memo, useState } from "react";

interface GigaSocialComposerProps {
  communitySlug?: string;
  disabled?: boolean;
  onSubmit: (args: {
    body: string;
    postType: SocialPostTypeId;
    mediaUrl?: string;
    communitySlug?: string;
  }) => Promise<void>;
}

export const GigaSocialComposer = memo(function GigaSocialComposer({
  communitySlug,
  disabled,
  onSubmit,
}: GigaSocialComposerProps) {
  const [body, setBody] = useState("");
  const [postType, setPostType] = useState<SocialPostTypeId>("text");
  const [mediaUrl, setMediaUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (busy || disabled) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        body,
        postType,
        mediaUrl: mediaUrl.trim() || undefined,
        communitySlug,
      });
      setBody("");
      setMediaUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create post.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="saas-card rounded-2xl border border-border p-4">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Share something with the Giga3 community…"
        className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
        disabled={disabled || busy}
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <select
          value={postType}
          onChange={(e) => setPostType(e.target.value as SocialPostTypeId)}
          className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
          disabled={disabled || busy}
        >
          {POST_TYPE_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
          placeholder="Image URL (optional)"
          className="min-w-0 flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm"
          disabled={disabled || busy}
        />
        <Button
          type="button"
          disabled={disabled || busy || (!body.trim() && !mediaUrl.trim())}
          onClick={() => void handleSubmit()}
          className="min-h-10"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Post
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
