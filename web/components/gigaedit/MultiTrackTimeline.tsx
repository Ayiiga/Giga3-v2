"use client";

import { formatTimecodeMs, stepFrame } from "@/lib/gigaedit/frameTime";
import {
  clipsForLane,
  formatRulerTime,
  syntheticCaptionsBar,
  syntheticLogoBar,
  TIMELINE_LANES,
  type SyntheticLaneBar,
} from "@/lib/gigaedit/timelineLanes";
import { snapTimelineSec } from "@/lib/gigaedit/timelineLayers";
import type { GigaEditTimelineClip } from "@/lib/gigaedit/types";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

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
  onMoveClip: (clipId: string, nextStartSec: number, nextEndSec: number) => void;
  onTrimClip: (clipId: string, edge: "start" | "end", sec: number) => void;
};

function playheadFromPointer(clientX: number, rect: DOMRect, max: number): number {
  const ratio = (clientX - rect.left) / rect.width;
  return Math.max(0, Math.min(max, ratio * max));
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
  const ticks = useMemo(() => {
    const step = max <= 20 ? 5 : max <= 60 ? 10 : 15;
    const result: number[] = [0];
    for (let t = step; t < max; t += step) result.push(t);
    if (result[result.length - 1] < max - 0.01) result.push(max);
    return result;
  }, [max]);

  const logoBar = syntheticLogoBar(max, Boolean(brandWatermark?.trim()), brandWatermark?.trim() || "Logo");
  const captionsBar = syntheticCaptionsBar(max, Boolean(hasCaptions));

  function handleRulerClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const sec = playheadFromPointer(e.clientX, rect, max);
    onPlayheadChange(snapTimelineSec(sec, clips, playheadSec, snapEnabled));
  }

  return (
    <div className="gigaedit-timeline space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs text-[var(--ge-muted)]">
        <span>
          {formatTimecodeMs(playheadSec)} / {formatTimecodeMs(durationSec)}
        </span>
        <span>Snap: {snapEnabled ? "ON" : "OFF"}</span>
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
              onSelectClip={onSelectClip}
              onPlayheadChange={onPlayheadChange}
              onMoveClip={onMoveClip}
              onTrimClip={onTrimClip}
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
  laneId: string;
  laneLabel: string;
  tone: string;
  max: number;
  clips: GigaEditTimelineClip[];
  synthetic: SyntheticLaneBar[];
  selectedClipId: string | null;
  snapEnabled: boolean;
  playheadSec: number;
  allClips: GigaEditTimelineClip[];
  onSelectClip: (clipId: string) => void;
  onPlayheadChange: (sec: number) => void;
  onMoveClip: (clipId: string, nextStartSec: number, nextEndSec: number) => void;
  onTrimClip: (clipId: string, edge: "start" | "end", sec: number) => void;
};

function TimelineRow({
  laneLabel,
  tone,
  max,
  clips,
  synthetic,
  selectedClipId,
  snapEnabled,
  playheadSec,
  allClips,
  onSelectClip,
  onPlayheadChange,
  onMoveClip,
  onTrimClip,
}: TimelineRowProps) {
  return (
    <>
      <p className="gigaedit-timeline-label">{laneLabel}</p>
      <div
        className="gigaedit-timeline-track relative"
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
            max={max}
            tone={tone}
            selected={clip.id === selectedClipId}
            onSelect={() => onSelectClip(clip.id)}
            onMoveClip={onMoveClip}
            onTrimClip={onTrimClip}
          />
        ))}
      </div>
    </>
  );
}

type TimelineClipBlockProps = {
  clip: GigaEditTimelineClip;
  max: number;
  tone: string;
  selected: boolean;
  onSelect: () => void;
  onMoveClip: (clipId: string, nextStartSec: number, nextEndSec: number) => void;
  onTrimClip: (clipId: string, edge: "start" | "end", sec: number) => void;
};

function TimelineClipBlock({
  clip,
  max,
  tone,
  selected,
  onSelect,
  onMoveClip,
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
        clip.locked && "opacity-60"
      )}
      style={{ left: `${left}%`, width: `${width}%` }}
      title={clip.label}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
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
