"use client";

import { CameraStylePreview } from "@/components/gigaedit/CameraStylePreview";
import { BrandingPanel } from "@/components/gigaedit/BrandingPanel";
import { ImportModeDialog } from "@/components/gigaedit/ImportModeDialog";
import { LayerManager } from "@/components/gigaedit/LayerManager";
import { MultiTrackTimeline } from "@/components/gigaedit/MultiTrackTimeline";
import { OverlayInspector } from "@/components/gigaedit/OverlayInspector";
import { OverlayPreviewStack } from "@/components/gigaedit/OverlayPreviewStack";
import { PublishScreen } from "@/components/gigaedit/PublishScreen";
import { DEFAULT_BRAND_KIT, loadBrandKit, type GigaEditBrandKit } from "@/lib/gigaedit/creatorStudio/brandKit";
import {
  detectBrandingFromImageData,
  shouldAutoCleanUserBranding,
  type BrandingDetection,
} from "@/lib/gigaedit/brandingDetection";
import { formatTimecodeMs } from "@/lib/gigaedit/frameTime";
import { inferClipLane, laneLabel } from "@/lib/gigaedit/timelineLanes";
import { captureFileThumbnail, captureVideoElementThumbnail } from "@/lib/gigaedit/thumbnailCapture";
import {
  applyClipLaneChange,
  buildOverlayClip,
  migrateTimelineClips,
  nextOverlayLayer,
  normalizeVideoClip,
  projectTimelineDuration,
  snapTimelineSec,
  sortedMainVideoClips,
  sortedOverlayClips,
} from "@/lib/gigaedit/timelineLayers";
import {
  canRedo,
  canUndo,
  createUndoStack,
  pushUndoState,
  redoState,
  undoState,
} from "@/lib/gigaedit/undoStack";
import {
  exportCompositedTimeline,
  mainTrackSegments,
  timelineNeedsCompositeExport,
} from "@/lib/gigaedit/videoCompositeExport";
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
  readVideoDuration,
  remainingJoinSlots,
  sortedVideoClips,
  sourceSecToTimelineSec,
  timelineSecToSourceSec,
} from "@/lib/gigaedit/timelineJoin";
import { EXPORT_FORMATS, MAX_GIGAEDIT_JOIN_CLIPS, type BrandingAction, type ExportAspectRatio, type GigaEditTimelineClip, type GigaEditTimelineLane } from "@/lib/gigaedit/types";
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
  Undo2,
  Redo2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

function newClip(partial: Omit<GigaEditTimelineClip, "id">): GigaEditTimelineClip {
  return { ...partial, id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
}

export type VideoEditorProps = {
  initialProjectId?: string | null;
  initialAspect?: ExportAspectRatio | null;
  /** Open the file picker once on mount (Creator Home → Import Video). */
  autoImport?: boolean;
};

export function VideoEditor({
  initialProjectId = null,
  initialAspect = null,
  autoImport = false,
}: VideoEditorProps) {
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
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [pendingImportFiles, setPendingImportFiles] = useState<File[]>([]);
  const [pendingImportMode, setPendingImportMode] = useState<"replace" | "append">("append");
  const [undoStack, setUndoStack] = useState(() => createUndoStack<GigaEditTimelineClip[]>([]));
  const [brandDetections, setBrandDetections] = useState<BrandingDetection[]>([]);
  const [brandKit, setBrandKit] = useState<GigaEditBrandKit>(DEFAULT_BRAND_KIT);
  const originalFileRef = useRef<File | null>(null);
  const sourceFilesRef = useRef<Map<string, File>>(new Map());
  const importSessionActiveRef = useRef(false);
  const audioFileRef = useRef<File | null>(null);
  const tier = useMemo(() => detectDeviceTier(), []);
  const videoClipCount = useMemo(() => sortedMainVideoClips(clips).length, [clips]);
  const overlayClipCount = useMemo(() => sortedOverlayClips(clips).length, [clips]);
  const timelineDuration = useMemo(
    () => projectTimelineDuration(clips) || duration,
    [clips, duration]
  );
  const selectedClip = useMemo(
    () => clips.find((c) => c.id === selectedClipId) ?? null,
    [clips, selectedClipId]
  );

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

  function commitClips(
    next: GigaEditTimelineClip[] | ((prev: GigaEditTimelineClip[]) => GigaEditTimelineClip[]),
    opts?: { skipUndo?: boolean }
  ) {
    setClips((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      const migrated = migrateTimelineClips(resolved);
      if (!opts?.skipUndo) {
        setUndoStack((stack) => pushUndoState(stack, migrated));
      }
      return migrated;
    });
  }

  function undoClips() {
    setUndoStack((stack) => {
      if (!canUndo(stack)) return stack;
      const next = undoState(stack);
      setClips(next.present);
      return next;
    });
  }

  function redoClips() {
    setUndoStack((stack) => {
      if (!canRedo(stack)) return stack;
      const next = redoState(stack);
      setClips(next.present);
      return next;
    });
  }

  useEffect(() => {
    void loadBrandKit().then(setBrandKit);
  }, []);

  useEffect(() => {
    if (clips.length === 0 && !projectId) return;
    const timer = window.setTimeout(() => {
      void saveProject();
    }, 2500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounced autosave
  }, [clips, overlayText, filterId, aspectRatio, captions, projectId]);

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
    if (!autoImport || initialProjectId) return;
    const timer = window.setTimeout(() => inputRef.current?.click(), 150);
    return () => window.clearTimeout(timer);
  }, [autoImport, initialProjectId]);

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
      commitClips(project.clips || [], { skipUndo: true });
      setUndoStack(createUndoStack(migrateTimelineClips(project.clips || [])));
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
        importSessionActiveRef.current = true;
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

  function projectHasVideos(nextClips: GigaEditTimelineClip[] = clips): boolean {
    return (
      importSessionActiveRef.current ||
      sortedVideoClips(nextClips).length > 0 ||
      sourceFilesRef.current.size > 0 ||
      Boolean(originalFileRef.current)
    );
  }

  function isVideoImportFile(file: File): boolean {
    if (file.type.startsWith("video/")) return true;
    const ext = file.name.split(".").pop()?.toLowerCase();
    return ext === "mp4" || ext === "mov" || ext === "webm" || ext === "m4v";
  }

  function resolveImportMode(nextClips: GigaEditTimelineClip[] = clips): "replace" | "append" {
    return projectHasVideos(nextClips) ? "append" : "replace";
  }

  function registerSourceFile(sourceKey: string, file: File) {
    importSessionActiveRef.current = true;
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

  async function runBrandingScan(file: File) {
    const thumb = await captureFileThumbnail(file);
    if (!thumb || typeof document === "undefined") return;
    const img = new Image();
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = thumb;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 90;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, 160, 90);
    const detections = await detectBrandingFromImageData(ctx.getImageData(0, 0, 160, 90), brandKit);
    if (detections.length) setBrandDetections(detections);
  }

  async function importVideoFiles(
    files: File[],
    mode?: "replace" | "append",
    placement?: "main" | "overlay",
    overlayLane?: GigaEditTimelineLane
  ) {
    const videos = files.filter(isVideoImportFile);
    if (videos.length === 0) {
      setStatus("Please choose one or more video files.");
      return;
    }

    const importMode = mode ?? resolveImportMode();
    if (importMode === "append" && projectHasVideos() && !placement) {
      setPendingImportFiles(videos);
      setPendingImportMode("append");
      setImportDialogOpen(true);
      return;
    }

    if (placement === "overlay") {
      const tierSlots = remainingJoinSlots(clips);
      void tierSlots;
      let layerCursor = nextOverlayLayer(clips);
      const added: GigaEditTimelineClip[] = [];
      for (const file of videos) {
        const durationSec = await readVideoDuration(file);
        if (durationSec <= 0) continue;
        const sourceKey = `src_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        registerSourceFile(sourceKey, file);
        const thumb = await captureFileThumbnail(file);
        const lane = overlayLane ?? "b-roll";
        const clip = buildOverlayClip({
          sourceKey,
          label: file.name.replace(/\.[^.]+$/, "").slice(0, 18) || laneLabel(lane),
          durationSec,
          playheadSec: snapTimelineSec(playhead, clips, playhead, snapEnabled),
          videoLayer: layerCursor,
          thumbnailDataUrl: thumb,
          timelineLane: lane,
          cameraId: lane === "screen-recording" ? "screen" : undefined,
        });
        added.push(normalizeVideoClip(clip));
        layerCursor += 1;
        void runBrandingScan(file);
      }
      if (added.length === 0) {
        setStatus("Could not add overlay videos.");
        return;
      }
      commitClips((prev) => [...prev, ...added]);
      const last = added[added.length - 1];
      setSelectedClipId(last.id);
      setPlayhead(last.startSec);
      revokeManagedObjectUrl(objectUrl);
      const previewFile = sourceFilesRef.current.get(last.sourceKey ?? "");
      if (previewFile) setObjectUrl(createManagedObjectUrl(previewFile));
      setStatus(
        `Added ${added.length} ${laneLabel(overlayLane ?? "b-roll")} clip${added.length === 1 ? "" : "s"} at ${formatTimecodeMs(playhead)}.`
      );
      return;
    }

    const slots = importMode === "replace" ? MAX_GIGAEDIT_JOIN_CLIPS : remainingJoinSlots(clips);
    if (slots <= 0) {
      setStatus(`Main track supports up to ${MAX_GIGAEDIT_JOIN_CLIPS} sequential clips. Try “Add as overlay”.`);
      return;
    }

    const selected = videos.slice(0, slots);
    const additions: Array<{ sourceKey: string; label: string; durationSec: number; thumb?: string }> = [];

    if (importMode === "replace") {
      sourceFilesRef.current.clear();
      originalFileRef.current = null;
      importSessionActiveRef.current = false;
    }

    for (const file of selected) {
      const durationSec = await readVideoDuration(file);
      if (durationSec <= 0) {
        setStatus(`Could not read duration for ${file.name}. Skipped.`);
        continue;
      }
      const sourceKey =
        importMode === "replace" && additions.length === 0
          ? "primary"
          : `src_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      registerSourceFile(sourceKey, file);
      const thumb = await captureFileThumbnail(file);
      additions.push({
        sourceKey,
        label: file.name.replace(/\.[^.]+$/, "").slice(0, 18) || `Clip ${additions.length + 1}`,
        durationSec,
        thumb,
      });
      void runBrandingScan(file);
    }

    if (additions.length === 0) {
      setStatus("Could not import the selected videos.");
      return;
    }

    const nextClips =
      importMode === "replace"
        ? buildSequentialVideoClips(
            clips.filter((clip) => clip.track !== "video" || (clip.videoLayer ?? 0) > 0),
            additions.map((a) => ({ sourceKey: a.sourceKey, label: a.label, durationSec: a.durationSec }))
          )
        : buildSequentialVideoClips(clips, additions.map((a) => ({ sourceKey: a.sourceKey, label: a.label, durationSec: a.durationSec })));

    const withThumbs = nextClips.map((clip) => {
      const add = additions.find((a) => a.sourceKey === clip.sourceKey);
      return add?.thumb ? { ...clip, clipThumbnailDataUrl: add.thumb } : clip;
    });

    commitClips(withThumbs);
    setDuration(projectTimelineDuration(withThumbs));
    const joinedVideos = sortedMainVideoClips(withThumbs);
    const previewClip =
      importMode === "append" ? joinedVideos[joinedVideos.length - 1] : joinedVideos[0];
    setPlayhead(previewClip?.startSec ?? 0);
    setSelectedClipId(previewClip?.id ?? null);
    revokeManagedObjectUrl(objectUrl);
    const previewKey = previewClip?.sourceKey ?? additions[0]?.sourceKey ?? "primary";
    const previewFile = sourceFilesRef.current.get(previewKey);
    if (previewFile) setObjectUrl(createManagedObjectUrl(previewFile));
    setStatus(
      importMode === "replace"
        ? `Imported ${additions.length} video${additions.length === 1 ? "" : "s"} on the main track.`
        : `Added ${additions.length} clip${additions.length === 1 ? "" : "s"} to main track (${joinedVideos.length}/${MAX_GIGAEDIT_JOIN_CLIPS}).`
    );
  }

  function onPickFiles(fileList: FileList | null, mode?: "replace" | "append") {
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
    commitClips((prev) => [
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
    if (projectHasVideos()) return;
    importSessionActiveRef.current = true;
    commitClips([
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
    commitClips((prev) => [left, right, ...prev.filter((clip) => clip.id !== active.id)]);
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
    commitClips((prev) => [
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
        timelineLane: "text",
      }),
    ]);
    setStatus("Text overlay added — included in export.");
  }

  function addStickerMarker() {
    commitClips((prev) => [
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
        timelineLane: "text",
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
    commitClips((prev) => [
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

  async function captureThumbnail(): Promise<string | undefined> {
    const video = videoRef.current;
    if (!video) return undefined;
    return captureVideoElementThumbnail(video);
  }

  function updateClipById(nextClip: GigaEditTimelineClip) {
    commitClips((prev) => prev.map((c) => (c.id === nextClip.id ? normalizeVideoClip(nextClip) : c)));
  }

  function deleteClipById(clipId: string) {
    commitClips((prev) => prev.filter((c) => c.id !== clipId));
    if (selectedClipId === clipId) setSelectedClipId(null);
  }

  function moveClipOnTimeline(
    clipId: string,
    nextStartSec: number,
    nextEndSec: number,
    targetLane?: GigaEditTimelineLane
  ) {
    const duration = Math.max(0.25, nextEndSec - nextStartSec);
    commitClips((prev) =>
      prev.map((c) => {
        if (c.id !== clipId || c.locked) return c;
        const start = snapTimelineSec(nextStartSec, prev, playhead, snapEnabled, clipId);
        let next: GigaEditTimelineClip = { ...c, startSec: start, endSec: start + duration };
        if (targetLane && inferClipLane(c) !== targetLane) {
          const others = prev.filter((row) => row.id !== clipId);
          const reassigned = applyClipLaneChange(c, targetLane, nextOverlayLayer(others));
          if (reassigned) {
            next = { ...reassigned, startSec: start, endSec: start + duration };
          }
        }
        return next;
      })
    );
    if (targetLane) {
      setStatus(`Moved to ${laneLabel(targetLane)} track.`);
    }
  }

  function trimClipEdge(clipId: string, edge: "start" | "end", sec: number) {
    commitClips((prev) =>
      prev.map((c) => {
        if (c.id !== clipId || c.locked) return c;
        const snapped = snapTimelineSec(sec, prev, playhead, snapEnabled, clipId);
        if (edge === "start") {
          const nextStart = Math.min(snapped, c.endSec - 0.25);
          const delta = nextStart - c.startSec;
          return {
            ...c,
            startSec: nextStart,
            sourceStartSec: (c.sourceStartSec ?? 0) + delta * (c.speed ?? 1),
          };
        }
        const nextEnd = Math.max(snapped, c.startSec + 0.25);
        const timelineDur = nextEnd - c.startSec;
        return {
          ...c,
          endSec: nextEnd,
          sourceEndSec: (c.sourceStartSec ?? 0) + timelineDur * (c.speed ?? 1),
        };
      })
    );
  }

  function applyBrandingAction(
    clipId: string,
    action: BrandingAction,
    detection: BrandingDetection
  ) {
    if (detection.source === "unknown" && (action === "remove" || action === "replace")) {
      setStatus("Third-party branding cannot be auto-removed. Use crop, blur, or cover.");
      return;
    }
    commitClips((prev) =>
      prev.map((c) => {
        if (c.id !== clipId) return c;
        const next = { ...c, brandingAction: action, brandingSource: detection.source, brandingRegion: detection.region };
        if (action === "crop" && detection.region) {
          return {
            ...next,
            cropLeft: detection.region.x,
            cropTop: detection.region.y,
            cropRight: Math.max(0, 1 - detection.region.x - detection.region.w),
            cropBottom: Math.max(0, 1 - detection.region.y - detection.region.h),
          };
        }
        if (action === "remove" && shouldAutoCleanUserBranding(detection, brandKit.autoCleanMyBranding ?? false)) {
          return { ...next, opacity: 0.02, muted: true };
        }
        return next;
      })
    );
    setStatus(`Branding action “${action}” applied (non-destructive until export).`);
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
    project.durationSec = timelineDuration || duration || undefined;
    const thumb = await captureThumbnail();
    if (thumb) project.thumbnailDataUrl = thumb;
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
    const exportDuration = timelineDuration || duration;

    if (timelineNeedsCompositeExport(clips)) {
      setStatus("Compositing main video + overlays…");
      const exported = await exportCompositedTimeline({
        clips,
        resolveFile: resolveClipFile,
        aspectRatio,
        durationSec: exportDuration,
        globalRotateDeg: rotateDeg,
        globalCropScale: cropScale,
        globalFilterCss: filterCss,
        overlayText,
        captions,
        audioMode: audioFileRef.current ? "replace" : "original",
        replaceAudio: audioFileRef.current,
        tier,
        onProgress: (p) => setStatus(`Compositing… ${Math.round(p * 100)}%`),
      });
      return exported.file;
    }

    const videoClips = sortedMainVideoClips(clips);
    const range = activeVideoRange();
    const needsJoin = videoClips.length > 1;

    if (needsJoin) {
      setStatus(`Joining ${videoClips.length} videos into one export…`);
      const segments = mainTrackSegments(clips, resolveClipFile);
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
          Multi-track timeline — main sequence plus overlay layers. Import up to {MAX_GIGAEDIT_JOIN_CLIPS}{" "}
          main clips or add overlays at the playhead ({tier}-tier preview). Originals stay untouched.
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
          {videoClipCount > 0 ? "Add more videos" : "Import video"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="video/*,.mp4,.mov,.webm,.m4v"
          multiple
          className="sr-only"
          onChange={(e) => {
            onPickFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={videoClipCount === 0 || videoClipCount >= MAX_GIGAEDIT_JOIN_CLIPS}
          className="inline-flex items-center justify-center gap-1 rounded-xl border border-[var(--ge-border)] px-3 py-3 text-sm font-semibold disabled:opacity-50"
          onClick={() => addClipInputRef.current?.click()}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add another clip
        </button>
        <input
          ref={addClipInputRef}
          type="file"
          accept="video/*,.mp4,.mov,.webm,.m4v"
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
        Main {videoClipCount}/{MAX_GIGAEDIT_JOIN_CLIPS}
        {overlayClipCount > 0 ? ` · ${overlayClipCount} overlay${overlayClipCount === 1 ? "" : "s"}` : ""}
        {videoClipCount > 0 && videoClipCount < MAX_GIGAEDIT_JOIN_CLIPS ? " — add main or overlay" : ""}
      </p>
      </section>
      {audioLabel ? (
        <p className="text-[11px] text-[var(--ge-gold)]">Audio: {audioLabel}</p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="relative">
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
            setDuration((current) => Math.max(current, projectTimelineDuration(clips) || dur));
            ensureBaseClip(dur);
          }}
          onTimeUpdate={(el) => {
            const active =
              sortedMainVideoClips(clips).find((clip) => {
                const sourceStart = clip.sourceStartSec ?? 0;
                const sourceEnd = clip.sourceEndSec ?? clip.endSec - clip.startSec;
                return el.currentTime >= sourceStart - 0.05 && el.currentTime <= sourceEnd + 0.05;
              }) ?? sortedMainVideoClips(clips)[0];
            if (!active) {
              setPlayhead(el.currentTime);
              return;
            }
            setPlayhead(sourceSecToTimelineSec(active, el.currentTime));
          }}
        />
        <OverlayPreviewStack
          clips={clips}
          playheadSec={playhead}
          resolveFile={resolveClipFile}
          selectedClipId={selectedClipId}
          onSelectClip={setSelectedClipId}
          onMoveClip={(clipId, posX, posY) => {
            commitClips((prev) =>
              prev.map((c) => (c.id === clipId ? { ...c, posX, posY } : c))
            );
          }}
        />
        </div>

        <div className="space-y-3">
          <OverlayInspector
            clip={selectedClip}
            clips={clips}
            playheadSec={playhead}
            onUpdateClip={updateClipById}
            onDuplicateOverlay={(dup) => {
              commitClips((prev) => [...prev, dup]);
              setSelectedClipId(dup.id);
            }}
            onDeleteClip={deleteClipById}
          />
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

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="gigaedit-chip inline-flex items-center gap-1" onClick={undoClips} disabled={!canUndo(undoStack)}>
          <Undo2 className="h-3.5 w-3.5" /> Undo
        </button>
        <button type="button" className="gigaedit-chip inline-flex items-center gap-1" onClick={redoClips} disabled={!canRedo(undoStack)}>
          <Redo2 className="h-3.5 w-3.5" /> Redo
        </button>
        <button
          type="button"
          className={`gigaedit-chip ${snapEnabled ? "gigaedit-chip--active" : ""}`}
          onClick={() => setSnapEnabled((v) => !v)}
        >
          Snap {snapEnabled ? "ON" : "OFF"}
        </button>
        <span className="text-[11px] text-[var(--ge-muted)]">Preview quality: Auto</span>
      </div>

      <BrandingPanel
        detections={brandDetections}
        selectedClip={selectedClip}
        autoCleanEnabled={brandKit.autoCleanMyBranding ?? false}
        onApplyAction={applyBrandingAction}
        onDismiss={() => setBrandDetections([])}
      />

      <details className="gigaedit-glass group p-3" open>
        <summary className="cursor-pointer list-none text-sm font-semibold text-white">
          Timeline{" "}
          <span className="ml-2 text-xs font-normal text-[var(--ge-muted)]">
            {formatTimecodeMs(playhead)} · main, b-roll, cutout, screen, logo, text, captions
          </span>
        </summary>
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_14rem]">
          <MultiTrackTimeline
            clips={clips}
            durationSec={timelineMax}
            playheadSec={playhead}
            selectedClipId={selectedClipId}
            snapEnabled={snapEnabled}
            brandWatermark={brandKit.watermarkText || brandKit.name}
            hasCaptions={Boolean(captions.trim())}
            onSelectClip={setSelectedClipId}
            onPlayheadChange={setPlayhead}
            onMoveClip={moveClipOnTimeline}
            onTrimClip={trimClipEdge}
          />
          <LayerManager
            clips={clips}
            selectedClipId={selectedClipId}
            onUpdateClips={(next) => commitClips(next)}
            onSelectClip={setSelectedClipId}
          />
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

      <ImportModeDialog
        open={importDialogOpen}
        fileCount={pendingImportFiles.length}
        onChoose={(placement, overlayLane) => {
          setImportDialogOpen(false);
          void importVideoFiles(pendingImportFiles, pendingImportMode, placement, overlayLane);
          setPendingImportFiles([]);
        }}
        onCancel={() => {
          setImportDialogOpen(false);
          setPendingImportFiles([]);
        }}
      />
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
