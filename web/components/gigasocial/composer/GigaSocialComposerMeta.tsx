"use client";

import { visibilityLabel } from "@/lib/gigasocial/fanBranding";
import { MapPin, AtSign } from "lucide-react";
import { memo } from "react";

const QUICK_EMOJIS = ["✨", "🔥", "💜", "📚", "🎬", "🙌"];

type GigaSocialComposerMetaProps = {
  location: string;
  onLocationChange: (value: string) => void;
  visibility: "public" | "followers";
  onVisibilityChange: (value: "public" | "followers") => void;
  onInsertMention: () => void;
  onInsertEmoji: (emoji: string) => void;
  disabled?: boolean;
  compact?: boolean;
};

export const GigaSocialComposerMeta = memo(function GigaSocialComposerMeta({
  location,
  onLocationChange,
  visibility,
  onVisibilityChange,
  onInsertMention,
  onInsertEmoji,
  disabled,
  compact = false,
}: GigaSocialComposerMetaProps) {
  return (
    <div
      className={
        compact
          ? "flex flex-wrap items-center gap-1.5"
          : "space-y-2 rounded-xl border border-border/80 bg-white/80 px-3 py-2.5"
      }
    >
      <label className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-muted">
        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="sr-only">Location</span>
        <input
          type="text"
          value={location}
          onChange={(event) => onLocationChange(event.target.value)}
          disabled={disabled}
          placeholder="Location (optional)"
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
        />
      </label>
      <select
        value={visibility}
        onChange={(event) => onVisibilityChange(event.target.value as "public" | "followers")}
        disabled={disabled}
        aria-label="Audience"
        className="rounded-lg border border-border bg-white px-2 py-1 text-xs"
      >
        <option value="public">{visibilityLabel("public")}</option>
        <option value="followers">{visibilityLabel("followers")}</option>
      </select>
      <button
        type="button"
        disabled={disabled}
        onClick={onInsertMention}
        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-muted hover:bg-accent/5"
        aria-label="Insert mention"
      >
        <AtSign className="h-3.5 w-3.5" aria-hidden />
        @
      </button>
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          disabled={disabled}
          onClick={() => onInsertEmoji(emoji)}
          className="rounded-md px-1 py-0.5 text-sm hover:bg-accent/10"
          aria-label={`Insert ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
});
