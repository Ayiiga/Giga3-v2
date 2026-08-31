"use client";

import { formatTimecodeMs, stepFrame } from "@/lib/gigaedit/frameTime";
import {
  layerDisplayName,
  sortedMainVideoClips,
  sortedOverlayClips,
  videoLayerIds,
} from "@/lib/gigaedit/timelineLayers";
import type { GigaEditTimelineClip } from "@/lib/gigaedit/types";
import { cn } from "@/lib/utils";

type MultiTrackTimelineProps = {
  clips: GigaEditTimelineClip[];
  durationSec: number;
  playheadSec: number;
  selectedClipId: string | null;
  snapEnabled: boolean;
  onSelectClip: (clipId: string) => void;
  onPlayheadChange: (sec: number) => void;
  onMoveClip: (clipId: string, nextStartSec: number, nextEndSec: number) => void;
  onTrimClip: (clipId: string, edge: "start" | "end", sec: number) => void;
};

export function MultiTrackTimeline({
  clips,
  durationSec,
  playheadSec,
  selectedClipId,
  snapEnabled,
  onSelectClip,
  onPlayheadChange,
  onMoveClip,
  onTrimClip,
}: MultiTrackTimelineProps) {
  const max = Math.max(durationSec, 8);
  const layers = videoLayerIds(clips).filter((l) =>
    clips.some((c) => c.track === "video" && (c.videoLayer ?? 0) === l)
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs text-[var(--ge-muted)]">
        <span>
          {formatTimecodeMs(playheadSec)} / {formatTimecodeMs(durationSec)}
        </span>
        <span>Snap: {snapEnabled ? "ON" : "OFF"}</span>
      </div>

      <div
        className="gigaedit-timeline-ruler relative h-6 cursor-pointer rounded-md border border-[var(--ge-border)] bg-[#0f172a]"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          onPlayheadChange(Math.max(0, ratio * max));
        }}
        role="slider"
        aria-label="Timeline playhead"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={playheadSec}
      >
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-[var(--ge-gold)]"
          style={{ left: `${(playheadSec / max) * 100}%` }}
        />
      </div>

      {layers.map((layer) => {
        const layerClips =
          layer === 0
            ? sortedMainVideoClips(clips)
            : sortedOverlayClips(clips, layer);
        return (
          <div key={`layer-${layer}`}>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--ge-muted)]">
              {layerDisplayName(layer)}
            </p>
            <div className="gigaedit-timeline-track relative">
              {layerClips.map((clip) => {
                const selected = clip.id === selectedClipId;
                const left = (clip.startSec / max) * 100;
                const width = Math.max(4, ((clip.endSec - clip.startSec) / max) * 100);
                return (
                  <button
                    key={clip.id}
                    type="button"
                    className={cn(
                      "gigaedit-timeline-clip",
                      selected && "ring-2 ring-[var(--ge-gold)]",
                      clip.locked && "opacity-60"
                    )}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={clip.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectClip(clip.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowLeft") onMoveClip(clip.id, clip.startSec - 1 / 30, clip.endSec - 1 / 30);
                      if (e.key === "ArrowRight") onMoveClip(clip.id, clip.startSec + 1 / 30, clip.endSec + 1 / 30);
                    }}
                  >
                    {clip.clipThumbnailDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={clip.clipThumbnailDataUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover opacity-40"
                      />
                    ) : null}
                    <span className="relative z-[1] truncate">{clip.label}</span>
                    {!clip.locked ? (
                      <>
                        <span
                          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-white/30"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            const startX = e.clientX;
                            const origStart = clip.startSec;
                            const onMove = (ev: PointerEvent) => {
                              const delta = ((ev.clientX - startX) / e.currentTarget.parentElement!.parentElement!.clientWidth) * max;
                              onTrimClip(clip.id, "start", origStart + delta);
                            };
                            window.addEventListener("pointermove", onMove);
                            window.addEventListener("pointerup", () => window.removeEventListener("pointermove", onMove), { once: true });
                          }}
                        />
                        <span
                          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-white/30"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            const startX = e.clientX;
                            const origEnd = clip.endSec;
                            const onMove = (ev: PointerEvent) => {
                              const delta = ((ev.clientX - startX) / e.currentTarget.parentElement!.parentElement!.clientWidth) * max;
                              onTrimClip(clip.id, "end", origEnd + delta);
                            };
                            window.addEventListener("pointermove", onMove);
                            window.addEventListener("pointerup", () => window.removeEventListener("pointermove", onMove), { once: true });
                          }}
                        />
                      </>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {(["audio", "text", "sticker"] as const).map((track) => {
        const trackClips = clips.filter((c) => c.track === track);
        if (trackClips.length === 0) return null;
        return (
          <div key={track}>
            <p className="mb-1 text-[10px] uppercase tracking-wide text-[var(--ge-muted)]">{track}</p>
            <div className="gigaedit-timeline-track">
              {trackClips.map((c) => (
                <div
                  key={c.id}
                  className="gigaedit-timeline-clip opacity-80"
                  style={{
                    left: `${(c.startSec / max) * 100}%`,
                    width: `${Math.max(4, ((c.endSec - c.startSec) / max) * 100)}%`,
                  }}
                >
                  {c.label}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          className="gigaedit-chip text-[10px]"
          onClick={() => onPlayheadChange(stepFrame(playheadSec, -1))}
        >
          ◀ Frame
        </button>
        <button
          type="button"
          className="gigaedit-chip text-[10px]"
          onClick={() => onPlayheadChange(stepFrame(playheadSec, 1))}
        >
          Frame ▶
        </button>
      </div>
    </div>
  );
}
