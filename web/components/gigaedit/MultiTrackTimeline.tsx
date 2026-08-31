"use client";

import { formatTimecodeMs, stepFrame } from "@/lib/gigaedit/frameTime";
import {
  clipsForLane,
  formatRulerTime,
  inferClipLane,
  syntheticCaptionsBar,
  syntheticLogoBar,
  TIMELINE_LANES,
  type SyntheticLaneBar,
} from "@/lib/gigaedit/timelineLanes";
import { canDropClipOnLane, snapTimelineSec } from "@/lib/gigaedit/timelineLayers";
import type { GigaEditTimelineClip, GigaEditTimelineLane } from "@/lib/gigaedit/types";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

type MultiTrackTimelineProps = {
  clips: GigaEditTimelineClip[];
  durationSec: number;
  playheadSec: number;
  selectedClipId: string | null;
  snapEnabled: boolean;
  brandWatermark?: string;
  hasCaptions?: boolean;
  onSelectClip: (clipId: string) => void;
  onPlayheadChange: (sec: number) => void;
  onMoveClip: (
    clipId: string,
    nextStartSec: number,
    nextEndSec: number,
    targetLane?: GigaEditTimelineLane
  ) => void;
  onTrimClip: (clipId: string, edge: "start" | "end", sec: number) => void;
};

type ClipDragState = {
  clipId: string;
  pointerId: number;
  originX: number;
  origStart: number;
  origEnd: number;
  sourceLane: GigaEditTimelineLane;
  trackWidth: number;
};

function playheadFromPointer(clientX: number, rect: DOMRect, max: number): number {
  const ratio = (clientX - rect.left) / rect.width;
  return Math.max(0, Math.min(max, ratio * max));
}

function laneFromPoint(x: number, y: number): GigaEditTimelineLane | null {
  const track = document.elementFromPoint(x, y)?.closest("[data-lane-id]");
  const id = track?.getAttribute("data-lane-id");
  if (!id) return null;
  return id as GigaEditTimelineLane;
}

export function MultiTrackTimeline({
  clips,
  durationSec,
  playheadSec,
  selectedClipId,
  snapEnabled,
  brandWatermark,
  hasCaptions,
  onSelectClip,
  onPlayheadChange,
  onMoveClip,
  onTrimClip,
}: MultiTrackTimelineProps) {
  const max = Math.max(durationSec, 8);
  const [drag, setDrag] = useState<ClipDragState | null>(null);
  const [hoverLane, setHoverLane] = useState<GigaEditTimelineLane | null>(null);

  const ticks = useMemo(() => {
    const step = max <= 20 ? 5 : max <= 60 ? 10 : 15;
    const result: number[] = [0];
    for (let t = step; t < max; t += step) result.push(t);
    if (result[result.length - 1] < max - 0.01) result.push(max);
    return result;
  }, [max]);

  const logoBar = syntheticLogoBar(max, Boolean(brandWatermark?.trim()), brandWatermark?.trim() || "Logo");
  const captionsBar = syntheticCaptionsBar(max, Boolean(hasCaptions));

  useEffect(() => {
    if (!drag) return;

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      setHoverLane(laneFromPoint(e.clientX, e.clientY));
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      const clip = clips.find((c) => c.id === drag.clipId);
      if (!clip) {
        setDrag(null);
        setHoverLane(null);
        return;
      }

      const deltaSec = ((e.clientX - drag.originX) / drag.trackWidth) * max;
      const duration = Math.max(0.25, drag.origEnd - drag.origStart);
      const rawStart = Math.max(0, drag.origStart + deltaSec);
      const nextStart = snapTimelineSec(rawStart, clips, playheadSec, snapEnabled, drag.clipId);
      const nextEnd = nextStart + duration;

      const dropLane = laneFromPoint(e.clientX, e.clientY);
      const targetLane =
        dropLane && canDropClipOnLane(clip, dropLane) ? dropLane : drag.sourceLane;
      const laneChanged = targetLane !== inferClipLane(clip);

      onMoveClip(drag.clipId, nextStart, nextEnd, laneChanged ? targetLane : undefined);

      setDrag(null);
      setHoverLane(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [clips, drag, max, onMoveClip, playheadSec, snapEnabled]);

  function handleRulerClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const sec = playheadFromPointer(e.clientX, rect, max);
    onPlayheadChange(snapTimelineSec(sec, clips, playheadSec, snapEnabled));
  }

  function beginClipDrag(
    e: React.PointerEvent,
    clip: GigaEditTimelineClip,
    laneId: GigaEditTimelineLane,
    trackEl: HTMLDivElement
  ) {
    if (clip.locked) return;
    if ((e.target as HTMLElement).closest("[data-trim-handle]")) return;
    e.preventDefault();
    e.stopPropagation();
    onSelectClip(clip.id);
    setDrag({
      clipId: clip.id,
      pointerId: e.pointerId,
      originX: e.clientX,
      origStart: clip.startSec,
      origEnd: clip.endSec,
      sourceLane: laneId,
      trackWidth: trackEl.clientWidth,
    });
    setHoverLane(laneId);
  }

  return (
    <div className="gigaedit-timeline space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs text-[var(--ge-muted)]">
        <span>
          {formatTimecodeMs(playheadSec)} / {formatTimecodeMs(durationSec)}
        </span>
        <span>
          Snap: {snapEnabled ? "ON" : "OFF"}
          {drag ? " · Drag to another lane" : ""}
        </span>
      </div>

      <div className="gigaedit-timeline-grid">
        <div className="gigaedit-timeline-corner" aria-hidden />
        <div
          className="gigaedit-timeline-ruler relative h-7 cursor-pointer"
          onClick={handleRulerClick}
          role="slider"
          aria-label="Timeline playhead"
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={playheadSec}
        >
          {ticks.map((tick) => (
            <span
              key={tick}
              className="gigaedit-timeline-tick"
              style={{ left: `${(tick / max) * 100}%` }}
            >
              <span className="gigaedit-timeline-tick-label">{formatRulerTime(tick)}</span>
            </span>
          ))}
          <div
            className="gigaedit-timeline-playhead"
            style={{ left: `${(playheadSec / max) * 100}%` }}
          />
        </div>

        {TIMELINE_LANES.map((lane) => {
          const laneClips = clipsForLane(clips, lane.id);
          const synthetic: SyntheticLaneBar[] = [];
          if (lane.id === "logo" && logoBar) synthetic.push(logoBar);
          if (lane.id === "captions" && captionsBar) synthetic.push(captionsBar);
          const dropActive =
            Boolean(drag) &&
            hoverLane === lane.id &&
            (() => {
              const clip = clips.find((c) => c.id === drag?.clipId);
              return clip ? canDropClipOnLane(clip, lane.id) : false;
            })();

          return (
            <TimelineRow
              key={lane.id}
              laneId={lane.id}
              laneLabel={lane.label}
              tone={lane.tone}
              max={max}
              clips={laneClips}
              synthetic={synthetic}
              selectedClipId={selectedClipId}
              draggingClipId={drag?.clipId ?? null}
              dropActive={dropActive}
              onSelectClip={onSelectClip}
              onPlayheadChange={onPlayheadChange}
              onTrimClip={onTrimClip}
              onBeginDrag={beginClipDrag}
              snapEnabled={snapEnabled}
              allClips={clips}
              playheadSec={playheadSec}
            />
          );
        })}
      </div>

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

type TimelineRowProps = {
  laneId: GigaEditTimelineLane;
  laneLabel: string;
  tone: string;
  max: number;
  clips: GigaEditTimelineClip[];
  synthetic: SyntheticLaneBar[];
  selectedClipId: string | null;
  draggingClipId: string | null;
  dropActive: boolean;
  snapEnabled: boolean;
  playheadSec: number;
  allClips: GigaEditTimelineClip[];
  onSelectClip: (clipId: string) => void;
  onPlayheadChange: (sec: number) => void;
  onTrimClip: (clipId: string, edge: "start" | "end", sec: number) => void;
  onBeginDrag: (
    e: React.PointerEvent,
    clip: GigaEditTimelineClip,
    laneId: GigaEditTimelineLane,
    trackEl: HTMLDivElement
  ) => void;
};

function TimelineRow({
  laneId,
  laneLabel,
  tone,
  max,
  clips,
  synthetic,
  selectedClipId,
  draggingClipId,
  dropActive,
  snapEnabled,
  playheadSec,
  allClips,
  onSelectClip,
  onPlayheadChange,
  onTrimClip,
  onBeginDrag,
}: TimelineRowProps) {
  return (
    <>
      <p className="gigaedit-timeline-label">{laneLabel}</p>
      <div
        data-lane-id={laneId}
        className={cn("gigaedit-timeline-track relative", dropActive && "gigaedit-timeline-track--drop-target")}
        onClick={(e) => {
          if (e.target !== e.currentTarget) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const sec = playheadFromPointer(e.clientX, rect, max);
          onPlayheadChange(snapTimelineSec(sec, allClips, playheadSec, snapEnabled));
        }}
      >
        <div
          className="gigaedit-timeline-playhead gigaedit-timeline-playhead--track"
          style={{ left: `${(playheadSec / max) * 100}%` }}
          aria-hidden
        />
        {synthetic.map((bar) => (
          <div
            key={bar.id}
            className={cn("gigaedit-timeline-clip gigaedit-timeline-clip--synthetic", `gigaedit-timeline-clip--${tone}`)}
            style={{
              left: `${(bar.startSec / max) * 100}%`,
              width: `${Math.max(4, ((bar.endSec - bar.startSec) / max) * 100)}%`,
            }}
            title={bar.label}
          >
            <span className="relative z-[1] truncate">{bar.label}</span>
          </div>
        ))}
        {clips.map((clip) => (
          <TimelineClipBlock
            key={clip.id}
            clip={clip}
            laneId={laneId}
            max={max}
            tone={tone}
            selected={clip.id === selectedClipId}
            dragging={clip.id === draggingClipId}
            onSelect={() => onSelectClip(clip.id)}
            onBeginDrag={onBeginDrag}
            onTrimClip={onTrimClip}
          />
        ))}
      </div>
    </>
  );
}

type TimelineClipBlockProps = {
  clip: GigaEditTimelineClip;
  laneId: GigaEditTimelineLane;
  max: number;
  tone: string;
  selected: boolean;
  dragging: boolean;
  onSelect: () => void;
  onBeginDrag: (
    e: React.PointerEvent,
    clip: GigaEditTimelineClip,
    laneId: GigaEditTimelineLane,
    trackEl: HTMLDivElement
  ) => void;
  onTrimClip: (clipId: string, edge: "start" | "end", sec: number) => void;
};

function TimelineClipBlock({
  clip,
  laneId,
  max,
  tone,
  selected,
  dragging,
  onSelect,
  onBeginDrag,
  onTrimClip,
}: TimelineClipBlockProps) {
  const left = (clip.startSec / max) * 100;
  const width = Math.max(4, ((clip.endSec - clip.startSec) / max) * 100);

  return (
    <button
      type="button"
      className={cn(
        "gigaedit-timeline-clip",
        `gigaedit-timeline-clip--${tone}`,
        selected && "ring-2 ring-[var(--ge-gold)]",
        dragging && "gigaedit-timeline-clip--dragging",
        clip.locked && "opacity-60"
      )}
      style={{ left: `${left}%`, width: `${width}%` }}
      title={clip.locked ? `${clip.label} (locked)` : `${clip.label} — drag to move or change lane`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerDown={(e) => {
        const track = e.currentTarget.parentElement;
        if (track instanceof HTMLDivElement) onBeginDrag(e, clip, laneId, track);
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
            data-trim-handle="start"
            className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-white/30"
            onPointerDown={(e) => {
              e.stopPropagation();
              const track = e.currentTarget.parentElement?.parentElement;
              if (!track) return;
              const startX = e.clientX;
              const origStart = clip.startSec;
              const onMove = (ev: PointerEvent) => {
                const delta = ((ev.clientX - startX) / track.clientWidth) * max;
                onTrimClip(clip.id, "start", origStart + delta);
              };
              window.addEventListener("pointermove", onMove);
              window.addEventListener("pointerup", () => window.removeEventListener("pointermove", onMove), {
                once: true,
              });
            }}
          />
          <span
            data-trim-handle="end"
            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-white/30"
            onPointerDown={(e) => {
              e.stopPropagation();
              const track = e.currentTarget.parentElement?.parentElement;
              if (!track) return;
              const startX = e.clientX;
              const origEnd = clip.endSec;
              const onMove = (ev: PointerEvent) => {
                const delta = ((ev.clientX - startX) / track.clientWidth) * max;
                onTrimClip(clip.id, "end", origEnd + delta);
              };
              window.addEventListener("pointermove", onMove);
              window.addEventListener("pointerup", () => window.removeEventListener("pointermove", onMove), {
                once: true,
              });
            }}
          />
        </>
      ) : null}
    </button>
  );
}
