"use client";

import { CameraStylePreview } from "@/components/gigaedit/CameraStylePreview";
import { PublishScreen } from "@/components/gigaedit/PublishScreen";
import { DEFAULT_CAMERA_LOOK, type CameraLookOptions } from "@/lib/gigaedit/cameraLook";
import { detectDeviceTier } from "@/lib/gigaedit/deviceCapability";
import { aspectRatioCss } from "@/lib/gigaedit/exportFormats";
import {
  createEmptyProject,
  getGigaEditProject,
  getProjectAudioBlob,
  getProjectClipBlob,
  getProjectOriginalBlob,
  listGigaEditProjects,
  putProjectAudioBlob,
  putProjectClipBlob,
  putProjectOriginalBlob,
  saveGigaEditProject,
} from "@/lib/gigaedit/projects";
import { enqueueGigaEditSync } from "@/lib/gigaedit/offline";
import {
  createManagedObjectUrl,
  revokeManagedObjectUrl,
} from "@/lib/gigaedit/mediaPipeline";
import { handoffAndOpenGigaSocial } from "@/lib/gigaedit/publishHandoff";
import { exportEditedVideoFile, exportJoinedVideoClips, videoNeedsBake } from "@/lib/gigaedit/videoExport";
import {
  buildSequentialVideoClips,
  clipAtTimelineSec,
  joinedTimelineDuration,
  readVideoDuration,
  remainingJoinSlots,
  sortedVideoClips,
  sourceSecToTimelineSec,
  timelineSecToSourceSec,
} from "@/lib/gigaedit/timelineJoin";
import { EXPORT_FORMATS, MAX_GIGAEDIT_JOIN_CLIPS, type ExportAspectRatio, type GigaEditTimelineClip } from "@/lib/gigaedit/types";
import { CAMERA_FILTERS, getCameraFilterCss } from "@/lib/gigasocial/cameraFilters";
import { formatVideoTime } from "@/lib/gigasocial/videoTrim";
import {
  Captions,
  Crop,
  Gauge,
  Merge,
  Mic,
  Plus,
  RotateCw,
  Scissors,
  SplitSquareVertical,
  Sticker,
  Type,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

function newClip(partial: Omit<GigaEditTimelineClip, "id">): GigaEditTimelineClip {
  return { ...partial, id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
}

export type VideoEditorProps = {
  initialProjectId?: string | null;
  initialAspect?: ExportAspectRatio | null;
};

export function VideoEditor({ initialProjectId = null, initialAspect = null }: VideoEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const addClipInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [playhead, setPlayhead] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<ExportAspectRatio>(initialAspect ?? "9:16");
  const [filterId, setFilterId] = useState("none");
  const [speed, setSpeed] = useState(1);
  const [rotateDeg, setRotateDeg] = useState(0);
  const [cropScale, setCropScale] = useState(1);
  const [overlayText, setOverlayText] = useState("");
  const [captions, setCaptions] = useState("");
  const [contrastBoost, setContrastBoost] = useState(false);
  const [clips, setClips] = useState<GigaEditTimelineClip[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [publishReady, setPublishReady] = useState(false);
  const [editedPublishFile, setEditedPublishFile] = useState<File | null>(null);
  const [projectId, setProjectId] = useState<string | undefined>(initialProjectId ?? undefined);
  const [cameraLook, setCameraLook] = useState<CameraLookOptions>(DEFAULT_CAMERA_LOOK);
  const [exporting, setExporting] = useState(false);
  const [audioLabel, setAudioLabel] = useState<string | null>(null);
  const originalFileRef = useRef<File | null>(null);
  const sourceFilesRef = useRef<Map<string, File>>(new Map());
  const audioFileRef = useRef<File | null>(null);
  const tier = useMemo(() => detectDeviceTier(), []);
  const videoClipCount = useMemo(() => sortedVideoClips(clips).length, [clips]);
  const timelineDuration = useMemo(() => joinedTimelineDuration(clips) || duration, [clips, duration]);

  const filterCss = useMemo(() => {
    const base = getCameraFilterCss(filterId) ?? "none";
    if (contrastBoost) {
      return `${base === "none" ? "" : base} contrast(1.15)`.trim() || "contrast(1.15)";
    }
    return base;
  }, [filterId, contrastBoost]);

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

  useEffect(() => {
    if (initialAspect) setAspectRatio(initialAspect);
  }, [initialAspect]);

  useEffect(() => {
    if (!initialProjectId) return;
    let cancelled = false;
    void (async () => {
      const project = await getGigaEditProject(initialProjectId);
      if (!project || cancelled) return;
      setProjectId(project.id);
      setAspectRatio(project.aspectRatio);
      setFilterId(project.filterId || "none");
      setOverlayText(project.overlayText || "");
      setClips(project.clips || []);
      const blob = await getProjectOriginalBlob(project.id);
      if (blob && !cancelled) {
        const file = new File([blob], `${project.title || "project"}.mp4`, {
          type: blob.type || "video/mp4",
        });
        originalFileRef.current = file;
        sourceFilesRef.current.set("primary", file);
      }
      for (const clip of project.clips || []) {
        if (!clip.sourceKey || clip.sourceKey === "primary" || cancelled) continue;
        const clipBlob = await getProjectClipBlob(project.id, clip.sourceKey);
        if (!clipBlob) continue;
        sourceFilesRef.current.set(
          clip.sourceKey,
          new File([clipBlob], `${clip.label || clip.sourceKey}.mp4`, {
            type: clipBlob.type || "video/mp4",
          })
        );
      }
      const firstClip = sortedVideoClips(project.clips || [])[0];
      const previewKey = firstClip?.sourceKey ?? "primary";
      const previewFile = sourceFilesRef.current.get(previewKey) ?? originalFileRef.current;
      if (previewFile && !cancelled) {
        revokeManagedObjectUrl(objectUrl);
        setObjectUrl(createManagedObjectUrl(previewFile));
        setStatus(`Opened project “${project.title}”. Original preserved.`);
      }
      const audioBlob = await getProjectAudioBlob(project.id);
      if (audioBlob && !cancelled) {
        audioFileRef.current = new File([audioBlob], "voiceover.webm", {
          type: audioBlob.type || "audio/webm",
        });
        setAudioLabel("Attached voiceover from project");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once per project id
  }, [initialProjectId]);

  function registerSourceFile(sourceKey: string, file: File) {
    sourceFilesRef.current.set(sourceKey, file);
    if (!originalFileRef.current) {
      originalFileRef.current = file;
    }
  }

  function resolveClipFile(clip: GigaEditTimelineClip): File | null {
    const key = clip.sourceKey ?? "primary";
    return sourceFilesRef.current.get(key) ?? originalFileRef.current;
  }

  function syncPreviewToTimeline(timelineSec: number) {
    const clip = clipAtTimelineSec(clips, timelineSec) ?? sortedVideoClips(clips)[0];
    if (!clip) return;
    const file = resolveClipFile(clip);
    if (!file) return;
    const key = clip.sourceKey ?? "primary";
    if (!objectUrl || sourceFilesRef.current.get(key) !== file) {
      revokeManagedObjectUrl(objectUrl);
      setObjectUrl(createManagedObjectUrl(file));
    }
    const video = videoRef.current;
    if (!video) return;
    const targetSourceSec = timelineSecToSourceSec(clip, timelineSec);
    if (Math.abs(video.currentTime - targetSourceSec) > 0.12) {
      try {
        video.currentTime = targetSourceSec;
      } catch {
        /* ignore */
      }
    }
  }

  async function importVideoFiles(files: File[], mode: "replace" | "append") {
    const videos = files.filter((file) => file.type.startsWith("video/"));
    if (videos.length === 0) {
      setStatus("Please choose one or more video files.");
      return;
    }

    const slots = mode === "replace" ? MAX_GIGAEDIT_JOIN_CLIPS : remainingJoinSlots(clips);
    if (slots <= 0) {
      setStatus(`You can join up to ${MAX_GIGAEDIT_JOIN_CLIPS} videos in one project.`);
      return;
    }

    const selected = videos.slice(0, slots);
    const additions: Array<{ sourceKey: string; label: string; durationSec: number }> = [];

    if (mode === "replace") {
      sourceFilesRef.current.clear();
      originalFileRef.current = null;
    }

    for (const file of selected) {
      const durationSec = await readVideoDuration(file);
      if (durationSec <= 0) {
        setStatus(`Could not read duration for ${file.name}. Skipped.`);
        continue;
      }
      const sourceKey =
        mode === "replace" && additions.length === 0 && videoClipCount === 0
          ? "primary"
          : `src_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      registerSourceFile(sourceKey, file);
      additions.push({
        sourceKey,
        label: file.name.replace(/\.[^.]+$/, "").slice(0, 18) || `Clip ${additions.length + 1}`,
        durationSec,
      });
    }

    if (additions.length === 0) {
      setStatus("Could not import the selected videos.");
      return;
    }

    const nextClips =
      mode === "replace"
        ? buildSequentialVideoClips(
            clips.filter((clip) => clip.track !== "video"),
            additions
          )
        : buildSequentialVideoClips(clips, additions);

    setClips(nextClips);
    setDuration(joinedTimelineDuration(nextClips));
    setPlayhead(sortedVideoClips(nextClips)[0]?.startSec ?? 0);
    revokeManagedObjectUrl(objectUrl);
    const firstKey = additions[0]?.sourceKey ?? "primary";
    const firstFile = sourceFilesRef.current.get(firstKey);
    if (firstFile) setObjectUrl(createManagedObjectUrl(firstFile));
    setStatus(
      mode === "replace"
        ? `Imported ${additions.length} video${additions.length === 1 ? "" : "s"}. Join up to ${MAX_GIGAEDIT_JOIN_CLIPS} clips, then publish as one.`
        : `Added ${additions.length} clip${additions.length === 1 ? "" : "s"}. ${sortedVideoClips(nextClips).length}/${MAX_GIGAEDIT_JOIN_CLIPS} videos joined.`
    );
  }

  function onPickFiles(fileList: FileList | null, mode: "replace" | "append") {
    if (!fileList?.length) return;
    void importVideoFiles(Array.from(fileList), mode);
  }

  async function attachAudioFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      setStatus("Please choose an audio file.");
      return;
    }
    audioFileRef.current = file;
    setAudioLabel(file.name);
    setClips((prev) => [
      ...prev.filter((c) => c.track !== "audio"),
      newClip({
        track: "audio",
        label: file.name.slice(0, 18),
        startSec: 0,
        endSec: Math.max(1, duration || 8),
        speed: 1,
        rotateDeg: 0,
        filterId: "none",
      }),
    ]);
    if (projectId) await putProjectAudioBlob(projectId, file);
    setStatus("Audio attached to timeline — will mix into export.");
  }

  async function attachLatestAudioProject() {
    const rows = await listGigaEditProjects();
    const audioProject = rows.find((p) => p.kind === "audio" && p.hasOriginal);
    if (!audioProject) {
      setStatus("No saved audio takes yet. Record in Audio Studio first.");
      return;
    }
    const blob = await getProjectOriginalBlob(audioProject.id);
    if (!blob) {
      setStatus("Could not load the latest audio take.");
      return;
    }
    await attachAudioFile(
      new File([blob], `${audioProject.title || "voiceover"}.webm`, {
        type: blob.type || "audio/webm",
      })
    );
  }

  function ensureBaseClip(dur: number) {
    if (sortedVideoClips(clips).length > 0) return;
    setClips([
      newClip({
        track: "video",
        label: "Clip 1",
        startSec: 0,
        endSec: dur || 5,
        speed: 1,
        rotateDeg: 0,
        filterId: "none",
        sourceKey: "primary",
        sourceStartSec: 0,
        sourceEndSec: dur || 5,
      }),
    ]);
  }

  function activeVideoRange() {
    const videoClips = sortedVideoClips(clips);
    if (videoClips.length === 0) {
      return { startSec: 0, endSec: Math.max(0.5, duration || 5) };
    }
    return {
      startSec: videoClips[0].startSec,
      endSec: videoClips[videoClips.length - 1].endSec,
    };
  }

  function trimActive() {
    const active = clipAtTimelineSec(clips, playhead) ?? sortedVideoClips(clips)[0];
    if (!active) return;
    const file = resolveClipFile(active);
    const sourceDuration = (active.sourceEndSec ?? active.endSec) - (active.sourceStartSec ?? 0);
    const sourcePlayhead = timelineSecToSourceSec(active, playhead);
    const start = Math.max(active.sourceStartSec ?? 0, sourcePlayhead);
    const end = Math.min(
      active.sourceEndSec ?? active.endSec - active.startSec,
      start + Math.max(1, sourceDuration * 0.35)
    );
    const trimmedDuration = Math.max(0.25, (end - start) / Math.max(0.25, active.speed || 1));
    setClips((prev) =>
      prev.map((clip) =>
        clip.id === active.id
          ? {
              ...clip,
              sourceStartSec: start,
              sourceEndSec: end,
              endSec: clip.startSec + trimmedDuration,
              label: "Trimmed",
            }
          : clip
      )
    );
    syncPreviewToTimeline(active.startSec);
    setStatus(`Trimmed to ${formatVideoTime(start)}–${formatVideoTime(end)} (baked on export).`);
  }

  function splitAtPlayhead() {
    const active = clipAtTimelineSec(clips, playhead);
    if (!active) return;
    const sourcePlayhead = timelineSecToSourceSec(active, playhead);
    const sourceStart = active.sourceStartSec ?? 0;
    const sourceEnd = active.sourceEndSec ?? active.endSec - active.startSec;
    if (sourcePlayhead <= sourceStart + 0.2 || sourcePlayhead >= sourceEnd - 0.2) {
      setStatus("Move the playhead inside the clip to split.");
      return;
    }
    const leftDuration = (sourcePlayhead - sourceStart) / Math.max(0.25, active.speed || 1);
    const rightDuration = (sourceEnd - sourcePlayhead) / Math.max(0.25, active.speed || 1);
    const left = {
      ...active,
      endSec: active.startSec + leftDuration,
      sourceEndSec: sourcePlayhead,
      label: `${active.label} A`,
    };
    const right = newClip({
      ...active,
      startSec: active.startSec + leftDuration,
      endSec: active.startSec + leftDuration + rightDuration,
      sourceStartSec: sourcePlayhead,
      sourceEndSec: sourceEnd,
      label: `${active.label} B`,
    });
    setClips((prev) => [left, right, ...prev.filter((clip) => clip.id !== active.id)]);
    setStatus("Clip split at playhead.");
  }

  function mergeClips() {
    const videoClips = sortedVideoClips(clips);
    if (videoClips.length < 2) {
      setStatus("Add another video with “Add clip” to join up to 10 clips as one.");
      return;
    }
    setStatus(
      `${videoClips.length}/${MAX_GIGAEDIT_JOIN_CLIPS} videos queued. Publish to export them as one video.`
    );
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
    setStatus("Text overlay added — included in export.");
  }

  function addStickerMarker() {
    setClips((prev) => [
      ...prev,
      newClip({
        track: "sticker",
        label: "Sticker",
        startSec: playhead,
        endSec: playhead + 2,
        speed: 1,
        rotateDeg: 0,
        filterId: "none",
        text: "✨",
      }),
    ]);
    if (!overlayText.includes("✨")) setOverlayText((t) => (t ? `${t} ✨` : "✨"));
    setStatus("Sticker marker added to timeline (rendered via overlay on export).");
  }

  function autoCaptions() {
    type SpeechRec = {
      continuous: boolean;
      interimResults: boolean;
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void) | null;
      onerror: (() => void) | null;
      start: () => void;
    };
    const w = typeof window !== "undefined" ? (window as Window & Record<string, unknown>) : null;
    const SpeechRecognitionCtor = w
      ? ((w.SpeechRecognition || w.webkitSpeechRecognition) as
          | (new () => SpeechRec)
          | undefined)
      : undefined;

    if (SpeechRecognitionCtor && objectUrl) {
      setStatus("Listening for draft captions (browser speech)…");
      try {
        const recognition = new SpeechRecognitionCtor();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.onresult = (event) => {
          const text = Array.from(event.results)
            .map((r) => r[0]?.transcript || "")
            .join(" ")
            .trim();
          if (text) {
            setCaptions(`[Draft captions · edit freely]\n0:00 ${text}`);
            setStatus("Draft captions captured from speech. Edit before export.");
          }
        };
        recognition.onerror = () => {
          seedManualCaptions();
        };
        recognition.start();
        return;
      } catch {
        /* fall through */
      }
    }
    seedManualCaptions();
  }

  function seedManualCaptions() {
    const lines = [
      "[Draft captions · edit freely]",
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
    setStatus("Draft caption template added. Edit freely — baked into export.");
  }

  async function saveProject() {
    const project = createEmptyProject({
      kind: "video",
      title: originalFileRef.current?.name.replace(/\.[^.]+$/, "") || "Video project",
      aspectRatio,
    });
    if (projectId) project.id = projectId;
    project.clips = clips;
    project.overlayText = overlayText;
    project.filterId = filterId;
    project.aiAssisted = Boolean(captions) || contrastBoost;
    project.hasOriginal = Boolean(originalFileRef.current);
    project.status = "draft";
    await saveGigaEditProject(project);
    if (originalFileRef.current) {
      await putProjectOriginalBlob(project.id, originalFileRef.current);
    }
    for (const [sourceKey, file] of sourceFilesRef.current.entries()) {
      if (sourceKey === "primary") continue;
      await putProjectClipBlob(project.id, sourceKey, file);
    }
    if (audioFileRef.current) {
      await putProjectAudioBlob(project.id, audioFileRef.current);
    }
    enqueueGigaEditSync({ projectId: project.id, action: "backup" });
    setProjectId(project.id);
    setStatus("Draft auto-saved locally. Original file preserved.");
    return project.id;
  }

  async function bakeEditedFile(): Promise<File> {
    const original = originalFileRef.current;
    if (!original) throw new Error("Import a video first.");
    const videoClips = sortedVideoClips(clips);
    const joinedDuration = joinedTimelineDuration(clips) || duration;
    const range = activeVideoRange();
    const needsJoin = videoClips.length > 1;

    if (needsJoin) {
      setStatus(`Joining ${videoClips.length} videos into one export…`);
      const segments = videoClips.map((clip) => {
        const file = resolveClipFile(clip);
        if (!file) throw new Error("Missing source video for one of the joined clips.");
        return {
          file,
          sourceStartSec: clip.sourceStartSec ?? 0,
          sourceEndSec: clip.sourceEndSec ?? clip.endSec - clip.startSec,
          speed: clip.speed ?? speed,
        };
      });
      const exported = await exportJoinedVideoClips(segments, {
        rotateDeg,
        cropScale,
        filterCss,
        overlayText,
        captions,
        aspectRatio,
        audioMode: audioFileRef.current ? "replace" : "original",
        replaceAudio: audioFileRef.current,
        tier,
        onProgress: (p) => setStatus(`Joining clips… ${Math.round(p * 100)}%`),
      });
      return exported.file;
    }

    const active = videoClips[0];
    const exportFile = resolveClipFile(active) ?? original;
    const sourceStart = active?.sourceStartSec ?? range.startSec;
    const sourceEnd = active?.sourceEndSec ?? range.endSec;
    const sourceDuration = Math.max(0.25, sourceEnd - sourceStart);
    const needs = videoNeedsBake({
      startSec: sourceStart,
      endSec: sourceEnd,
      duration: sourceDuration,
      speed: active?.speed ?? speed,
      rotateDeg,
      cropScale,
      filterCss,
      overlayText,
      captions,
      audioMode: audioFileRef.current ? "replace" : "original",
    });
    if (!needs) return original;

    setStatus("Baking edits into a new video file…");
    const exported = await exportEditedVideoFile(exportFile, {
      startSec: sourceStart,
      endSec: sourceEnd,
      speed: active?.speed ?? speed,
      rotateDeg,
      cropScale,
      filterCss,
      overlayText,
      captions,
      aspectRatio,
      audioMode: audioFileRef.current ? "replace" : "original",
      replaceAudio: audioFileRef.current,
      tier,
      onProgress: (p) => setStatus(`Exporting… ${Math.round(p * 100)}%`),
    });
    return exported.file;
  }

  async function readyToPublish() {
    if (!originalFileRef.current) {
      setStatus("Import a video first.");
      return;
    }
    setExporting(true);
    setStatus("Preparing edited video for GigaSocial…");
    try {
      const id = await saveProject();
      setProjectId(id);
      const edited = await bakeEditedFile();
      setEditedPublishFile(edited);
      const result = await handoffAndOpenGigaSocial({
        kind: "video",
        edited,
        original: originalFileRef.current,
        aspectRatio,
        destination: "feed",
        caption: overlayText,
        projectId: id,
        durationSec: timelineDuration || undefined,
        aiAssisted: Boolean(captions) || contrastBoost,
        audio: audioFileRef.current,
        audioMixMode: audioFileRef.current ? "replace" : "original",
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
    } finally {
      setExporting(false);
    }
  }

  async function openPublishOptions() {
    if (!originalFileRef.current) {
      setStatus("Import a video first.");
      return;
    }
    setExporting(true);
    try {
      const id = await saveProject();
      setProjectId(id);
      const edited = await bakeEditedFile();
      setEditedPublishFile(edited);
      setPublishReady(true);
      setStatus("Review privacy & destination, then publish.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not bake edited video.");
    } finally {
      setExporting(false);
    }
  }

  const timelineMax = Math.max(timelineDuration, 8);

  if (publishReady && originalFileRef.current && editedPublishFile) {
    return (
      <PublishScreen
        kind="video"
        editedFile={editedPublishFile}
        originalFile={originalFileRef.current}
        aspectRatio={aspectRatio}
        durationSec={timelineDuration || undefined}
        projectId={projectId}
        aiAssisted={Boolean(captions) || contrastBoost}
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
          Import or add up to {MAX_GIGAEDIT_JOIN_CLIPS} videos, trim and style them, then publish as one
          joined clip ({tier}-tier). Originals stay untouched.
        </p>
      </div>

      <section className="gigaedit-glass space-y-3 p-3" aria-label="Video project actions">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ge-muted)]">
            Start or finish
          </p>
          <p className="text-[11px] text-[var(--ge-muted)]">Original stays safe</p>
        </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="rounded-xl bg-[var(--ge-gold)] px-3 py-3 text-sm font-bold text-[#0b1220]"
          onClick={() => inputRef.current?.click()}
        >
          Import video
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            onPickFiles(e.target.files, videoClipCount > 0 ? "append" : "replace");
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={videoClipCount >= MAX_GIGAEDIT_JOIN_CLIPS}
          className="inline-flex items-center justify-center gap-1 rounded-xl border border-[var(--ge-border)] px-3 py-3 text-sm font-semibold disabled:opacity-50"
          onClick={() => addClipInputRef.current?.click()}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add clip
        </button>
        <input
          ref={addClipInputRef}
          type="file"
          accept="video/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            onPickFiles(e.target.files, "append");
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className="rounded-xl border border-[var(--ge-border)] px-3 py-3 text-sm"
          onClick={() => void saveProject()}
        >
          Save draft
        </button>
        <button
          type="button"
          disabled={exporting}
          className="col-span-2 rounded-xl bg-[var(--ge-gold)] px-3 py-3 text-sm font-bold text-[#0b1220] disabled:opacity-50"
          onClick={() => void readyToPublish()}
        >
          {exporting ? "Exporting…" : "Post to GigaSocial"}
        </button>
        <button
          type="button"
          disabled={exporting}
          className="rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs disabled:opacity-50"
          onClick={() => void openPublishOptions()}
        >
          Publish options
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-1 rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs"
          onClick={() => audioInputRef.current?.click()}
        >
          <Mic className="h-3.5 w-3.5" aria-hidden />
          Attach audio
        </button>
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          className="sr-only"
          onChange={(e) => void attachAudioFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          className="rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs"
          onClick={() => void attachLatestAudioProject()}
        >
          Use Audio Studio take
        </button>
      </div>
      <p className="text-[11px] font-semibold text-[var(--ge-gold)]">
        {videoClipCount}/{MAX_GIGAEDIT_JOIN_CLIPS} videos joined
      </p>
      </section>
      {audioLabel ? (
        <p className="text-[11px] text-[var(--ge-gold)]">Audio: {audioLabel}</p>
      ) : null}

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
            setDuration((current) => Math.max(current, joinedTimelineDuration(clips) || dur));
            ensureBaseClip(dur);
          }}
          onTimeUpdate={(el) => {
            const active =
              sortedVideoClips(clips).find((clip) => {
                const sourceStart = clip.sourceStartSec ?? 0;
                const sourceEnd = clip.sourceEndSec ?? clip.endSec - clip.startSec;
                return el.currentTime >= sourceStart - 0.05 && el.currentTime <= sourceEnd + 0.05;
              }) ?? sortedVideoClips(clips)[0];
            if (!active) {
              setPlayhead(el.currentTime);
              return;
            }
            setPlayhead(sourceSecToTimelineSec(active, el.currentTime));
          }}
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
              checked={contrastBoost}
              onChange={(e) => setContrastBoost(e.target.checked)}
            />
            Contrast boost (baked on export)
          </label>
        </div>
      </div>

      <section className="space-y-2" aria-labelledby="video-quick-tools">
        <div className="flex items-center justify-between gap-2">
          <h3 id="video-quick-tools" className="text-sm font-semibold">Quick tools</h3>
          <p className="text-[11px] text-[var(--ge-muted)]">Tap a tool to edit</p>
        </div>
      <div className="gigaedit-tool-rail flex gap-2 overflow-x-auto overscroll-x-contain pb-1">
        <ToolBtn icon={Scissors} label="Trim from playhead" onClick={trimActive} />
        <ToolBtn icon={SplitSquareVertical} label="Split" onClick={splitAtPlayhead} />
        <ToolBtn icon={Merge} label="Join status" onClick={mergeClips} />
        <ToolBtn icon={RotateCw} label="Rotate" onClick={() => setRotateDeg((d) => (d + 90) % 360)} />
        <ToolBtn icon={Crop} label="Reset crop" onClick={() => setCropScale(1)} />
        <ToolBtn icon={Gauge} label="1x speed" onClick={() => setSpeed(1)} />
        <ToolBtn icon={Captions} label="Draft captions" onClick={autoCaptions} />
        <ToolBtn icon={Type} label="Add text" onClick={addTextLayer} />
        <ToolBtn icon={Sticker} label="Add emoji marker" onClick={addStickerMarker} />
      </div>
      </section>

      <details className="gigaedit-glass group p-3">
        <summary className="cursor-pointer list-none text-sm font-semibold text-white">
          Timeline <span className="ml-2 text-xs font-normal text-[var(--ge-muted)]">Review clips and layers</span>
        </summary>
        <div className="mt-3 space-y-2">
        <p className="text-xs text-[var(--ge-muted)]">
          Playhead {formatVideoTime(playhead)} / {formatVideoTime(timelineMax)}
        </p>
        {(["video", "audio", "text", "sticker"] as const).map((track) => (
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
      </details>

      <details className="gigaedit-glass group p-3">
        <summary className="cursor-pointer list-none text-sm font-semibold text-white">
          Captions &amp; text <span className="ml-2 text-xs font-normal text-[var(--ge-muted)]">Add your finishing touches</span>
        </summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-[var(--ge-muted)]">
          Text overlay
          <input
            value={overlayText}
            onChange={(e) => setOverlayText(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--ge-border)] bg-[var(--ge-input)] px-3 py-2 text-sm text-white"
            placeholder="Add text / stickers…"
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
      </details>

      <p className="text-[11px] text-[var(--ge-muted)]">
        For generative background removal or AI music, open AI Studio. Local exports never replace your
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
