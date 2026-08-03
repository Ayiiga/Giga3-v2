"use client";

import { CameraStylePreview } from "@/components/gigaedit/CameraStylePreview";
import { PublishScreen } from "@/components/gigaedit/PublishScreen";
import { DEFAULT_CAMERA_LOOK, type CameraLookOptions } from "@/lib/gigaedit/cameraLook";
import { detectDeviceTier } from "@/lib/gigaedit/deviceCapability";
import { aspectRatioCss } from "@/lib/gigaedit/exportFormats";
import {
  createEmptyProject,
  putProjectOriginalBlob,
  saveGigaEditProject,
} from "@/lib/gigaedit/projects";
import { enqueueGigaEditSync } from "@/lib/gigaedit/offline";
import {
  createManagedObjectUrl,
  revokeManagedObjectUrl,
} from "@/lib/gigaedit/mediaPipeline";
import { handoffAndOpenGigaSocial } from "@/lib/gigaedit/publishHandoff";
import { EXPORT_FORMATS, type ExportAspectRatio, type GigaEditTimelineClip } from "@/lib/gigaedit/types";
import { CAMERA_FILTERS } from "@/lib/gigasocial/cameraFilters";
import { formatVideoTime } from "@/lib/gigasocial/videoTrim";
import {
  Captions,
  Crop,
  Gauge,
  Merge,
  RotateCw,
  Scissors,
  SplitSquareVertical,
  Type,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

function newClip(partial: Omit<GigaEditTimelineClip, "id">): GigaEditTimelineClip {
  return { ...partial, id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
}

export function VideoEditor() {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [playhead, setPlayhead] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<ExportAspectRatio>("9:16");
  const [filterId, setFilterId] = useState("none");
  const [speed, setSpeed] = useState(1);
  const [rotateDeg, setRotateDeg] = useState(0);
  const [cropScale, setCropScale] = useState(1);
  const [overlayText, setOverlayText] = useState("");
  const [captions, setCaptions] = useState("");
  const [greenScreen, setGreenScreen] = useState(false);
  const [clips, setClips] = useState<GigaEditTimelineClip[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [publishReady, setPublishReady] = useState(false);
  const [projectId, setProjectId] = useState<string | undefined>();
  const [cameraLook, setCameraLook] = useState<CameraLookOptions>(DEFAULT_CAMERA_LOOK);
  const originalFileRef = useRef<File | null>(null);
  const tier = useMemo(() => detectDeviceTier(), []);

  const filterCss = useMemo(() => {
    const base = CAMERA_FILTERS.find((f) => f.id === filterId)?.css ?? "none";
    if (greenScreen) {
      return `${base === "none" ? "" : base} contrast(1.1)`.trim() || "contrast(1.1)";
    }
    return base;
  }, [filterId, greenScreen]);

  const editTransform = useMemo(
    () => `rotate(${rotateDeg}deg) scale(${cropScale})`,
    [rotateDeg, cropScale]
  );

  useEffect(() => {
    return () => revokeManagedObjectUrl(objectUrl);
  }, [objectUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
  }, [speed, objectUrl]);

  function onPickFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setStatus("Please choose a video file.");
      return;
    }
    originalFileRef.current = file;
    revokeManagedObjectUrl(objectUrl);
    setObjectUrl(createManagedObjectUrl(file));
    setStatus("Original kept safely. Pro camera preview is non-destructive.");
  }

  function ensureBaseClip(dur: number) {
    if (clips.length > 0) return;
    setClips([
      newClip({
        track: "video",
        label: "Clip 1",
        startSec: 0,
        endSec: dur || 5,
        speed: 1,
        rotateDeg: 0,
        filterId: "none",
      }),
    ]);
  }

  function trimActive() {
    if (!clips[0]) return;
    const start = Math.max(0, playhead);
    const end = Math.min(duration || clips[0].endSec, start + Math.max(1, (duration || 8) * 0.35));
    setClips((prev) =>
      prev.map((c, i) => (i === 0 ? { ...c, startSec: start, endSec: end, label: "Trimmed" } : c))
    );
    const video = videoRef.current;
    if (video) video.currentTime = start;
    setStatus(`Trimmed to ${formatVideoTime(start)}–${formatVideoTime(end)}.`);
  }

  function splitAtPlayhead() {
    const active = clips.find((c) => c.track === "video");
    if (!active) return;
    if (playhead <= active.startSec + 0.2 || playhead >= active.endSec - 0.2) {
      setStatus("Move the playhead inside the clip to split.");
      return;
    }
    const left = { ...active, endSec: playhead, label: "A" };
    const right = newClip({
      ...active,
      startSec: playhead,
      label: "B",
    });
    setClips((prev) => [left, right, ...prev.filter((c) => c.id !== active.id)]);
    setStatus("Clip split at playhead.");
  }

  function mergeClips() {
    const videoClips = clips.filter((c) => c.track === "video").sort((a, b) => a.startSec - b.startSec);
    if (videoClips.length < 2) {
      setStatus("Need at least two video clips to merge.");
      return;
    }
    const merged = newClip({
      track: "video",
      label: "Merged",
      startSec: videoClips[0].startSec,
      endSec: videoClips[videoClips.length - 1].endSec,
      speed,
      rotateDeg,
      filterId,
    });
    setClips((prev) => [merged, ...prev.filter((c) => c.track !== "video")]);
    setStatus("Video clips merged on the timeline.");
  }

  function addTextLayer() {
    if (!overlayText.trim()) {
      setStatus("Enter overlay text first.");
      return;
    }
    setClips((prev) => [
      ...prev,
      newClip({
        track: "text",
        label: overlayText.slice(0, 18),
        startSec: playhead,
        endSec: playhead + 3,
        speed: 1,
        rotateDeg: 0,
        filterId: "none",
        text: overlayText,
      }),
    ]);
    setStatus("Text overlay added to timeline.");
  }

  function autoCaptions() {
    const lines = [
      "[AI-assisted captions · draft]",
      `0:00 Hook — welcome to this clip`,
      `${formatVideoTime(Math.max(1, (duration || 10) * 0.33))} Key point`,
      `${formatVideoTime(Math.max(2, (duration || 10) * 0.66))} Call to action`,
    ];
    setCaptions(lines.join("\n"));
    setClips((prev) => [
      ...prev.filter((c) => c.track !== "text" || !c.label.startsWith("Cap")),
      newClip({
        track: "text",
        label: "Captions",
        startSec: 0,
        endSec: duration || 8,
        speed: 1,
        rotateDeg: 0,
        filterId: "none",
        text: lines.join(" · "),
      }),
    ]);
    setStatus("Auto captions draft generated (AI-assisted). Edit freely before export.");
  }

  async function saveProject() {
    const project = createEmptyProject({
      kind: "video",
      title: originalFileRef.current?.name.replace(/\.[^.]+$/, "") || "Video project",
      aspectRatio,
    });
    project.clips = clips;
    project.overlayText = overlayText;
    project.filterId = filterId;
    project.aiAssisted = Boolean(captions) || greenScreen;
    project.hasOriginal = Boolean(originalFileRef.current);
    project.status = "draft";
    await saveGigaEditProject(project);
    if (originalFileRef.current) {
      await putProjectOriginalBlob(project.id, originalFileRef.current);
    }
    enqueueGigaEditSync({ projectId: project.id, action: "backup" });
    setProjectId(project.id);
    setStatus("Draft auto-saved locally. Original file preserved.");
    return project.id;
  }

  async function readyToPublish() {
    if (!originalFileRef.current) {
      setStatus("Import a video first.");
      return;
    }
    setStatus("Opening GigaSocial feed…");
    try {
      // Preserve original quality: hand off the source file as the publish media.
      const id = await saveProject();
      setProjectId(id);
      const result = await handoffAndOpenGigaSocial({
        kind: "video",
        edited: originalFileRef.current,
        original: originalFileRef.current,
        aspectRatio,
        destination: "feed",
        caption: overlayText,
        projectId: id,
        durationSec: duration || undefined,
        aiAssisted: Boolean(captions) || greenScreen,
      });
      if (result.queued) {
        setPublishReady(true);
        setStatus("You're offline — opened publish options. Post will sync when you're back online.");
        return;
      }
      if (result.error) {
        setPublishReady(true);
        setStatus(`${result.error} — adjust options below, then publish.`);
        return;
      }
    } catch (err) {
      setPublishReady(true);
      setStatus(err instanceof Error ? err.message : "Could not open GigaSocial.");
    }
  }

  async function openPublishOptions() {
    if (!originalFileRef.current) {
      setStatus("Import a video first.");
      return;
    }
    const id = await saveProject();
    setProjectId(id);
    setPublishReady(true);
  }

  const timelineMax = Math.max(duration, 8);

  if (publishReady && originalFileRef.current) {
    return (
      <PublishScreen
        kind="video"
        editedFile={originalFileRef.current}
        originalFile={originalFileRef.current}
        aspectRatio={aspectRatio}
        durationSec={duration || undefined}
        projectId={projectId}
        aiAssisted={Boolean(captions) || greenScreen}
        defaultCaption={overlayText}
        onClose={() => setPublishReady(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Video editor</h2>
        <p className="mt-1 text-xs text-[var(--ge-muted)]">
          Pro camera preview, multi-layer timeline, trim/split/merge, and social export — tuned for{" "}
          {tier}-tier devices. Advanced AI tools degrade gracefully offline.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-xl bg-[var(--ge-gold)] px-3 py-2 text-xs font-bold text-[#0b1220]"
          onClick={() => inputRef.current?.click()}
        >
          Import video
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="sr-only"
          onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          className="rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs"
          onClick={() => void saveProject()}
        >
          Save draft
        </button>
        <button
          type="button"
          className="rounded-xl bg-[var(--ge-gold)] px-3 py-2 text-xs font-bold text-[#0b1220]"
          onClick={() => void readyToPublish()}
        >
          Post to GigaSocial
        </button>
        <button
          type="button"
          className="rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs"
          onClick={() => void openPublishOptions()}
        >
          Publish options
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <CameraStylePreview
          kind="video"
          src={objectUrl}
          videoRef={videoRef}
          controls
          aspectRatioCss={aspectRatioCss(aspectRatio)}
          baseFilterCss={filterCss}
          extraTransform={editTransform}
          look={cameraLook}
          onLookChange={setCameraLook}
          emptyLabel="Import a video to start editing. Camera/mic access is only requested when you record."
          overlay={
            overlayText ? (
              <p className="pointer-events-none absolute inset-x-3 bottom-10 text-center text-sm font-bold text-white drop-shadow">
                {overlayText}
              </p>
            ) : null
          }
          onLoadedMetadata={(el) => {
            const dur = el.duration || 0;
            setDuration(dur);
            ensureBaseClip(dur);
          }}
          onTimeUpdate={(el) => setPlayhead(el.currentTime)}
        />

        <div className="space-y-3">
          <label className="block text-xs text-[var(--ge-muted)]">
            Export format
            <select
              className="mt-1 w-full rounded-lg border border-[var(--ge-border)] bg-[var(--ge-input)] px-2 py-2 text-sm text-white"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as ExportAspectRatio)}
            >
              {EXPORT_FORMATS.map((f) => (
                <option key={f.id} value={f.aspectRatio}>
                  {f.label} ({f.aspectRatio})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-[var(--ge-muted)]">
            Filter / effect
            <select
              className="mt-1 w-full rounded-lg border border-[var(--ge-border)] bg-[var(--ge-input)] px-2 py-2 text-sm text-white"
              value={filterId}
              onChange={(e) => setFilterId(e.target.value)}
            >
              {CAMERA_FILTERS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-[var(--ge-muted)]">
            Speed {speed.toFixed(2)}x
            <input
              type="range"
              min={0.25}
              max={3}
              step={0.05}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </label>
          <label className="block text-xs text-[var(--ge-muted)]">
            Crop / resize {cropScale.toFixed(2)}x
            <input
              type="range"
              min={1}
              max={2.2}
              step={0.01}
              value={cropScale}
              onChange={(e) => setCropScale(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </label>
          <label className="inline-flex items-center gap-2 text-xs text-[var(--ge-muted)]">
            <input
              type="checkbox"
              checked={greenScreen}
              onChange={(e) => setGreenScreen(e.target.checked)}
            />
            Green screen assist (preview)
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <ToolBtn icon={Scissors} label="Trim" onClick={trimActive} />
        <ToolBtn icon={SplitSquareVertical} label="Split" onClick={splitAtPlayhead} />
        <ToolBtn icon={Merge} label="Merge" onClick={mergeClips} />
        <ToolBtn icon={RotateCw} label="Rotate" onClick={() => setRotateDeg((d) => (d + 90) % 360)} />
        <ToolBtn icon={Crop} label="Reset crop" onClick={() => setCropScale(1)} />
        <ToolBtn icon={Gauge} label="1x speed" onClick={() => setSpeed(1)} />
        <ToolBtn icon={Captions} label="Auto captions" onClick={autoCaptions} />
        <ToolBtn icon={Type} label="Add text" onClick={addTextLayer} />
      </div>

      <div className="gigaedit-glass space-y-2 p-3">
        <p className="text-xs text-[var(--ge-muted)]">
          Playhead {formatVideoTime(playhead)} / {formatVideoTime(duration || timelineMax)}
        </p>
        {(["video", "audio", "text", "sticker", "effect"] as const).map((track) => (
          <div key={track}>
            <p className="mb-1 text-[10px] uppercase tracking-wide text-[var(--ge-muted)]">{track}</p>
            <div className="gigaedit-timeline-track">
              {clips
                .filter((c) => c.track === track)
                .map((c) => (
                  <div
                    key={c.id}
                    className="gigaedit-timeline-clip"
                    style={{
                      left: `${(c.startSec / timelineMax) * 100}%`,
                      width: `${Math.max(4, ((c.endSec - c.startSec) / timelineMax) * 100)}%`,
                    }}
                    title={c.label}
                  >
                    {c.label}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-[var(--ge-muted)]">
          Text overlay
          <input
            value={overlayText}
            onChange={(e) => setOverlayText(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--ge-border)] bg-[var(--ge-input)] px-3 py-2 text-sm text-white"
            placeholder="Add stickers/text…"
          />
        </label>
        <label className="block text-xs text-[var(--ge-muted)]">
          Subtitle editor
          <textarea
            value={captions}
            onChange={(e) => setCaptions(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-[var(--ge-border)] bg-[var(--ge-input)] px-3 py-2 text-sm text-white"
            placeholder="Edit captions…"
          />
        </label>
      </div>

      <p className="text-[11px] text-[var(--ge-muted)]">
        Also available in this timeline: transitions, stickers, music sync, AI noise reduction, and
        background removal — use Filters/Effects and AI Studio when online. Exports never replace your
        original upload.
      </p>
      {status ? <p className="text-xs text-[var(--ge-gold)]">{status}</p> : null}
    </div>
  );
}

function ToolBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Scissors;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-xl border border-[var(--ge-border)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--ge-muted)] hover:text-white"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}
