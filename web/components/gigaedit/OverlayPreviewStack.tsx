"use client";

import { overlaysAtTimelineSec } from "@/lib/gigaedit/timelineLayers";
import type { GigaEditTimelineClip } from "@/lib/gigaedit/types";
import { createManagedObjectUrl, revokeManagedObjectUrl } from "@/lib/gigaedit/mediaPipeline";
import { useEffect, useMemo, useRef } from "react";

type OverlayPreviewStackProps = {
  clips: GigaEditTimelineClip[];
  playheadSec: number;
  resolveFile: (clip: GigaEditTimelineClip) => File | null;
  selectedClipId: string | null;
  onSelectClip: (clipId: string) => void;
  onMoveClip: (clipId: string, posX: number, posY: number) => void;
};

export function OverlayPreviewStack({
  clips,
  playheadSec,
  resolveFile,
  selectedClipId,
  onSelectClip,
  onMoveClip,
}: OverlayPreviewStackProps) {
  const active = useMemo(
    () => overlaysAtTimelineSec(clips, playheadSec),
    [clips, playheadSec]
  );

  if (active.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {active.map((clip) => (
        <OverlayPreviewItem
          key={clip.id}
          clip={clip}
          file={resolveFile(clip)}
          selected={clip.id === selectedClipId}
          onSelect={() => onSelectClip(clip.id)}
          onMove={(x, y) => onMoveClip(clip.id, x, y)}
        />
      ))}
    </div>
  );
}

function OverlayPreviewItem({
  clip,
  file,
  selected,
  onSelect,
  onMove,
}: {
  clip: GigaEditTimelineClip;
  file: File | null;
  selected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const url = useMemo(() => (file ? createManagedObjectUrl(file) : null), [file]);

  useEffect(() => {
    return () => revokeManagedObjectUrl(url);
  }, [url]);

  const scale = (clip.scaleX ?? 0.4) * 100;
  const left = `${(clip.posX ?? 0.5) * 100}%`;
  const top = `${(clip.posY ?? 0.5) * 100}%`;

  return (
    <div
      className="pointer-events-auto absolute"
      style={{
        left,
        top,
        width: `${scale}%`,
        transform: `translate(-50%, -50%) rotate(${clip.rotateDeg ?? 0}deg)`,
        opacity: clip.opacity ?? 1,
        borderRadius: clip.maskShape === "circle" ? "9999px" : clip.roundedRadius ?? 0,
        overflow: "hidden",
        boxShadow: clip.shadowBlur ? `0 0 ${clip.shadowBlur}px rgba(0,0,0,0.45)` : undefined,
        outline: selected ? "2px solid #fbbf24" : undefined,
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
        const startX = e.clientX;
        const startY = e.clientY;
        const origX = clip.posX ?? 0.5;
        const origY = clip.posY ?? 0.5;
        const parent = e.currentTarget.parentElement?.getBoundingClientRect();
        if (!parent) return;
        const onMoveEvt = (ev: PointerEvent) => {
          const nx = origX + (ev.clientX - startX) / parent.width;
          const ny = origY + (ev.clientY - startY) / parent.height;
          onMove(Math.min(0.95, Math.max(0.05, nx)), Math.min(0.95, Math.max(0.05, ny)));
        };
        window.addEventListener("pointermove", onMoveEvt);
        window.addEventListener("pointerup", () => window.removeEventListener("pointermove", onMoveEvt), {
          once: true,
        });
      }}
    >
      {url ? (
        <video
          ref={videoRef}
          src={url}
          className="h-auto w-full object-contain"
          muted
          playsInline
          autoPlay
          loop
        />
      ) : (
        <div className="bg-black/40 p-2 text-[10px] text-white">{clip.label}</div>
      )}
    </div>
  );
}
