"use client";

import {
  canReuseSound,
  filterSounds,
  getSoundBlob,
  incrementSoundUsage,
  listSounds,
  soundAttributionLine,
  toggleSoundFavorite,
  type GigaEditSoundAsset,
  type SoundCategory,
} from "@/lib/gigaedit/soundLibrary";
import { Heart, Play, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const CATEGORIES: { id: SoundCategory | "all" | "favorites" | "recent"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "trending", label: "Trending" },
  { id: "original", label: "Original" },
  { id: "own", label: "My sounds" },
  { id: "saved", label: "Saved" },
  { id: "ai", label: "AI music" },
  { id: "device", label: "Device" },
  { id: "public_post", label: "From posts" },
  { id: "favorites", label: "Favorites" },
  { id: "recent", label: "Recent" },
];

type SoundLibraryPickerProps = {
  viewerHandle?: string;
  onSelect: (sound: GigaEditSoundAsset, file: File) => void;
  onClose?: () => void;
};

export function SoundLibraryPicker({
  viewerHandle,
  onSelect,
  onClose,
}: SoundLibraryPickerProps) {
  const [sounds, setSounds] = useState<GigaEditSoundAsset[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["id"]>("all");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void listSounds().then(setSounds);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const filtered = useMemo(
    () => filterSounds(sounds, { query, category }),
    [sounds, query, category]
  );

  async function preview(sound: GigaEditSoundAsset) {
    const blob = await getSoundBlob(sound.soundId);
    if (!blob) {
      setStatus("Sound file missing on this device.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(blob));
  }

  async function choose(sound: GigaEditSoundAsset) {
    if (!canReuseSound(sound, viewerHandle)) {
      setStatus("This sound is not available for reuse.");
      return;
    }
    const blob = await getSoundBlob(sound.soundId);
    if (!blob) {
      setStatus("Sound file missing on this device.");
      return;
    }
    await incrementSoundUsage(sound.soundId);
    const file = new File([blob], `${sound.title || "sound"}.webm`, {
      type: blob.type || "audio/webm",
    });
    onSelect(sound, file);
  }

  return (
    <div className="gigaedit-glass space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Use audio</h3>
        {onClose ? (
          <button type="button" className="text-xs text-[var(--ge-muted)]" onClick={onClose}>
            Close
          </button>
        ) : null}
      </div>

      <label className="flex items-center gap-2 rounded-xl border border-[var(--ge-border)] bg-[var(--ge-input)] px-3 py-2 text-xs">
        <Search className="h-3.5 w-3.5 text-[var(--ge-muted)]" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sounds…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </label>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${
              category === c.id
                ? "bg-[var(--ge-gold)] font-bold text-[#0b1220]"
                : "border border-[var(--ge-border)] text-[var(--ge-muted)]"
            }`}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {previewUrl ? <audio controls src={previewUrl} className="w-full" /> : null}

      {filtered.length === 0 ? (
        <p className="text-xs text-[var(--ge-muted)]">
          No sounds yet. Publish a video with reusable audio, import device audio, or record in Audio
          Studio.
        </p>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {filtered.map((sound) => (
            <li
              key={sound.soundId}
              className="flex items-start gap-2 rounded-xl border border-[var(--ge-border)] px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{sound.title}</p>
                <p className="text-[11px] text-[var(--ge-gold)]">{soundAttributionLine(sound)}</p>
                <p className="text-[10px] text-[var(--ge-muted)]">
                  {Math.round(sound.durationSec)}s · used {sound.usageCount}× · {sound.permission}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-[var(--ge-border)] p-1.5 text-[var(--ge-muted)]"
                aria-label="Favorite"
                onClick={() => void toggleSoundFavorite(sound.soundId).then(refresh)}
              >
                <Heart
                  className={`h-3.5 w-3.5 ${sound.favorite ? "fill-[var(--ge-gold)] text-[var(--ge-gold)]" : ""}`}
                />
              </button>
              <button
                type="button"
                className="rounded-lg border border-[var(--ge-border)] p-1.5 text-[var(--ge-muted)]"
                aria-label="Preview"
                onClick={() => void preview(sound)}
              >
                <Play className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="rounded-lg bg-[var(--ge-gold)] px-2 py-1 text-[11px] font-bold text-[#0b1220]"
                onClick={() => void choose(sound)}
              >
                Use
              </button>
            </li>
          ))}
        </ul>
      )}
      {status ? <p className="text-xs text-[var(--ge-gold)]">{status}</p> : null}
    </div>
  );
}
