"use client";

import {
  layerDisplayName,
  reorderVideoLayer,
  videoLayerIds,
} from "@/lib/gigaedit/timelineLayers";
import type { GigaEditTimelineClip } from "@/lib/gigaedit/types";
import { Eye, EyeOff, Lock, LockOpen } from "lucide-react";

type LayerManagerProps = {
  clips: GigaEditTimelineClip[];
  selectedClipId: string | null;
  onUpdateClips: (clips: GigaEditTimelineClip[]) => void;
  onSelectClip: (clipId: string) => void;
};

export function LayerManager({
  clips,
  selectedClipId,
  onUpdateClips,
  onSelectClip,
}: LayerManagerProps) {
  const layers = videoLayerIds(clips).filter((l) =>
    clips.some((c) => c.track === "video" && (c.videoLayer ?? 0) === l)
  );

  const layerClips = (layer: number) =>
    clips.filter((c) => c.track === "video" && (c.videoLayer ?? 0) === layer);

  function toggleLayerVisibility(layer: number) {
    const visible = layerClips(layer).some((c) => c.visible !== false);
    onUpdateClips(
      clips.map((c) =>
        c.track === "video" && (c.videoLayer ?? 0) === layer
          ? { ...c, visible: !visible }
          : c
      )
    );
  }

  function toggleLayerLock(layer: number) {
    const locked = layerClips(layer).some((c) => c.locked);
    onUpdateClips(
      clips.map((c) =>
        c.track === "video" && (c.videoLayer ?? 0) === layer
          ? { ...c, locked: !locked }
          : c
      )
    );
  }

  function renameClip(clipId: string, label: string) {
    onUpdateClips(clips.map((c) => (c.id === clipId ? { ...c, label } : c)));
  }

  return (
    <div className="gigaedit-glass space-y-2 p-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--ge-muted)]">Layers</h4>
      <ul className="space-y-2">
        {layers.map((layer) => {
          const items = layerClips(layer);
          const visible = items.some((c) => c.visible !== false);
          const locked = items.some((c) => c.locked);
          return (
            <li key={layer} className="rounded-lg border border-[var(--ge-border)] p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">{layerDisplayName(layer)}</span>
                <div className="flex gap-1">
                  <button type="button" className="rounded p-1" aria-label="Toggle visibility" onClick={() => toggleLayerVisibility(layer)}>
                    {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <button type="button" className="rounded p-1" aria-label="Toggle lock" onClick={() => toggleLayerLock(layer)}>
                    {locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                  </button>
                  {layer > 0 ? (
                    <>
                      <button
                        type="button"
                        className="text-[10px] text-[var(--ge-gold)]"
                        onClick={() => onUpdateClips(reorderVideoLayer(clips, layer, "up"))}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="text-[10px] text-[var(--ge-gold)]"
                        onClick={() => onUpdateClips(reorderVideoLayer(clips, layer, "down"))}
                      >
                        ↓
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
              <ul className="mt-1 space-y-1">
                {items.map((clip) => (
                  <li key={clip.id}>
                    <button
                      type="button"
                      className={`w-full rounded px-2 py-1 text-left text-[11px] ${
                        selectedClipId === clip.id ? "bg-[var(--ge-gold)]/20 text-[var(--ge-gold)]" : "text-[var(--ge-muted)]"
                      }`}
                      onClick={() => onSelectClip(clip.id)}
                    >
                      <input
                        className="w-full bg-transparent text-[11px] outline-none"
                        value={clip.label}
                        onChange={(e) => renameClip(clip.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
