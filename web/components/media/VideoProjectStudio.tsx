"use client";

import { Button } from "@/components/ui/Button";
import { CreditPromptBanner } from "@/components/billing/CreditPromptBanner";
import type { UsageSnapshot } from "@/lib/credits/constants";
import { mediaVideoCreditCost } from "@/lib/media/videoCredits";
import {
  applyExportPresetToProject,
  applyRegenerationModeToSettings,
  beginSceneGeneration,
  buildSceneGenerationPrompt,
  completeSceneGeneration,
  createDefaultConsistencyProfile,
  createTextOverlay,
  DEFAULT_GENERATION_SETTINGS,
  duplicateScene,
  EXPORT_PRESETS,
  gigaEditHandoffHref,
  MEDIA_STUDIO_VIDEO_CAPABILITIES,
  mergeQualityIntoProject,
  newGenerationNonce,
  newProjectId,
  newSceneId,
  planScenesFromPrompt,
  projectStatusFromScenes,
  reorderScenes,
  runVideoProjectQualityCheck,
  saveVideoProject,
  scheduleVideoProjectAutosave,
  suggestedTitleOverlaysFromPrompt,
  type CameraMovementId,
  type LightingStyleId,
  type SceneRegenerationMode,
  type VideoProject,
  type VideoScene,
  type VisualStyleId,
  VIDEO_PROJECT_AUTOSAVE_MS,
} from "@/lib/media/videoProject";
import type { VideoCategoryId } from "@/lib/media/catalog";
import { useMediaGeneration } from "@/hooks/useMediaGeneration";
import { useMediaVideoJob } from "@/hooks/useMediaVideoJob";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  CheckCircle2,
  Clapperboard,
  Film,
  GripVertical,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const CAMERA_OPTIONS: { id: CameraMovementId; label: string }[] = [
  { id: "cinematic", label: "Cinematic" },
  { id: "drone", label: "Drone" },
  { id: "aerial", label: "Aerial" },
  { id: "tracking", label: "Tracking" },
  { id: "slow_push_in", label: "Slow push-in" },
  { id: "pull_out", label: "Pull-out" },
  { id: "orbit", label: "Orbit" },
  { id: "crane", label: "Crane" },
  { id: "low_angle", label: "Low-angle" },
  { id: "high_angle", label: "High-angle" },
  { id: "first_person", label: "First-person" },
  { id: "handheld", label: "Handheld" },
  { id: "static", label: "Static" },
];

const LIGHTING_OPTIONS: { id: LightingStyleId; label: string }[] = [
  { id: "golden_hour", label: "Golden hour" },
  { id: "natural", label: "Natural" },
  { id: "dramatic", label: "Dramatic" },
  { id: "soft", label: "Soft" },
  { id: "studio", label: "Studio" },
  { id: "blue_hour", label: "Blue hour" },
  { id: "neon", label: "Neon" },
  { id: "overcast", label: "Overcast" },
];

const STYLE_OPTIONS: { id: VisualStyleId; label: string }[] = [
  { id: "cinematic_realism", label: "Cinematic realism" },
  { id: "futuristic", label: "Futuristic" },
  { id: "documentary", label: "Documentary" },
  { id: "warm_natural", label: "Warm natural" },
  { id: "high_contrast", label: "High contrast" },
  { id: "soft_dreamy", label: "Soft dreamy" },
];

type VideoProjectStudioProps = {
  usage: UsageSnapshot | null;
  initialPrompt?: string;
};

function createEmptyProject(prompt = ""): VideoProject {
  const title = prompt.trim().slice(0, 80) || "Untitled video project";
  return {
    id: newProjectId(),
    title,
    status: "draft",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    masterPrompt: prompt,
    settings: { ...DEFAULT_GENERATION_SETTINGS },
    consistency: createDefaultConsistencyProfile(title),
    scenes: [],
    textOverlays: [],
  };
}

export function VideoProjectStudio({ usage, initialPrompt = "" }: VideoProjectStudioProps) {
  const { createVideo } = useMediaGeneration();
  const videoJob = useMediaVideoJob();
  const [project, setProject] = useState<VideoProject>(() => createEmptyProject(initialPrompt));
  const [compareSceneId, setCompareSceneId] = useState<string | null>(null);
  const [qualityReport, setQualityReport] = useState(() => runVideoProjectQualityCheck(project));
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const autosaveRef = useRef<ReturnType<typeof scheduleVideoProjectAutosave> | null>(null);
  const generatingSceneRef = useRef<{ sceneId: string; nonce: string } | null>(null);
  const category: VideoCategoryId = "cinematic_trailers";

  const costPerScene = mediaVideoCreditCost(project.settings.durationSec);
  const estimatedCredits = costPerScene * project.scenes.length;
  const creditsAvailable = usage?.credits ?? null;
  const canAfford = creditsAvailable === null || creditsAvailable >= costPerScene;

  const persist = useCallback((next: VideoProject) => {
    setProject(next);
    autosaveRef.current?.cancel();
    autosaveRef.current = scheduleVideoProjectAutosave(next, VIDEO_PROJECT_AUTOSAVE_MS);
    void saveVideoProject(next).then((ok) => {
      if (ok) setSaveHint("Saved locally");
    });
  }, []);

  useEffect(() => {
    persist(createEmptyProject(initialPrompt));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once from URL prompt
  }, []);

  useEffect(() => {
    const job = videoJob.job;
    const gen = generatingSceneRef.current;
    if (!job || !gen || job.status === "processing") return;

    setProject((prev) => {
      const scenes = prev.scenes.map((s) => {
        if (s.id !== gen.sceneId) return s;
        if (job.status === "succeeded") {
          return {
            ...s,
            status: "succeeded" as const,
            outputUrl: job.outputUrl,
            jobId: job.jobId,
            creditsCharged: costPerScene,
            errorMessage: undefined,
          };
        }
        return {
          ...s,
          status: "failed" as const,
          errorMessage: job.errorMessage ?? "Generation failed",
        };
      });
      completeSceneGeneration(prev.id, gen.sceneId, gen.nonce);
      generatingSceneRef.current = null;
      const next = {
        ...prev,
        scenes,
        status: projectStatusFromScenes(scenes, prev.status),
        updatedAt: Date.now(),
      };
      void saveVideoProject(next);
      return next;
    });
  }, [videoJob.job, costPerScene]);

  const runSceneDirector = useCallback(() => {
    const result = planScenesFromPrompt({ masterPrompt: project.masterPrompt });
    const overlays = suggestedTitleOverlaysFromPrompt(project.masterPrompt);
    persist({
      ...project,
      title: result.suggestedTitle || project.title,
      scenes: result.scenes,
      consistency: { ...project.consistency, ...result.consistencyPatch },
      textOverlays: overlays.length ? overlays : project.textOverlays,
      status: "draft",
    });
  }, [project, persist]);

  const generateScene = useCallback(
    async (scene: VideoScene, mode: SceneRegenerationMode = "same_prompt") => {
      if (scene.locked) return;
      const nonce = newGenerationNonce();
      if (!beginSceneGeneration(project.id, scene.id, nonce)) return;

      const settings =
        mode === "same_prompt" || mode === "edit_prompt"
          ? project.settings
          : applyRegenerationModeToSettings(project.settings, mode);

      const prompt = buildSceneGenerationPrompt(scene.prompt, settings, project.consistency);
      const scenes = project.scenes.map((s) =>
        s.id === scene.id
          ? {
              ...s,
              status: "generating" as const,
              generationNonce: nonce,
              previousOutputUrl: s.outputUrl ?? s.previousOutputUrl,
              errorMessage: undefined,
            }
          : s
      );
      persist({ ...project, scenes, status: "generating" });
      generatingSceneRef.current = { sceneId: scene.id, nonce };
      videoJob.clear();

      const result = await createVideo(
        category,
        prompt,
        undefined,
        {
          aspectRatio: settings.aspectRatio,
          duration: settings.durationSec,
          resolution: settings.resolution,
          generateAudio: settings.generateAudio,
        }
      );
      if (result?.jobId) {
        videoJob.track(result.jobId);
      } else {
        completeSceneGeneration(project.id, scene.id, nonce);
        generatingSceneRef.current = null;
        persist({
          ...project,
          scenes: project.scenes.map((s) =>
            s.id === scene.id
              ? { ...s, status: "failed", errorMessage: "Could not start generation." }
              : s
          ),
          status: "needs_review",
        });
      }
    },
    [project, persist, createVideo, videoJob]
  );

  const updateScene = (sceneId: string, patch: Partial<VideoScene>) => {
    persist({
      ...project,
      scenes: project.scenes.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)),
    });
  };

  const runQualityCheck = () => {
    const report = runVideoProjectQualityCheck(project);
    setQualityReport(report);
    persist(mergeQualityIntoProject(project, report));
  };

  const sortedScenes = useMemo(
    () => [...project.scenes].sort((a, b) => a.order - b.order),
    [project.scenes]
  );

  return (
    <div className="space-y-6" data-testid="video-project-studio">
      <div className="rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50 to-white p-4 dark:border-violet-500/20 dark:from-violet-950/40 dark:to-zinc-950">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
              <Film className="h-4 w-4" aria-hidden />
              Video Project — Scene Director
            </p>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Prompt → plan scenes → generate individually → polish text in overlays → quality check →
              export in GigaEdit (timeline, captions, voice, music).
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium capitalize text-foreground shadow-sm dark:bg-zinc-900">
            {project.status.replace(/_/g, " ")}
          </span>
        </div>
        {saveHint && <p className="mt-2 text-xs text-muted">{saveHint}</p>}
      </div>

      {usage && creditsAvailable !== null && creditsAvailable < costPerScene && (
        <CreditPromptBanner requiredCredits={costPerScene} availableCredits={creditsAvailable} />
      )}

      <section className="saas-card space-y-4 p-4 sm:p-6">
        <h2 className="text-lg font-semibold">1. Describe your video</h2>
        <textarea
          value={project.masterPrompt}
          onChange={(e) => persist({ ...project, masterPrompt: e.target.value })}
          rows={4}
          className="input-surface sm:text-lg"
          placeholder='Example: Create a cinematic video showing Accra in 2050 — label as "AI-generated visualization".'
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={runSceneDirector} className="min-h-11 gap-2">
            <Wand2 className="h-4 w-4" aria-hidden />
            Build scenes
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => {
              persist({
                ...project,
                scenes: [
                  ...project.scenes,
                  {
                    id: newSceneId(),
                    order: project.scenes.length,
                    title: `Scene ${project.scenes.length + 1}`,
                    prompt: project.masterPrompt.trim() || "Cinematic scene",
                    locked: false,
                    status: "idle" as const,
                  },
                ],
              });
            }}
          >
            <Plus className="mr-1 h-4 w-4" aria-hidden />
            Add scene
          </Button>
        </div>
      </section>

      <section className="saas-card space-y-4 p-4 sm:p-6">
        <h2 className="text-lg font-semibold">2. Format & cinematic controls</h2>
        <p className="text-sm text-muted">
          Duration, aspect ratio, and resolution are sent to fal/Replicate. Camera, lighting, and style
          are applied via prompt steering (provider-safe).
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm">
            <span className="font-medium">Aspect ratio</span>
            <select
              className="input-surface mt-1 w-full"
              value={project.settings.aspectRatio}
              onChange={(e) =>
                persist({
                  ...project,
                  settings: {
                    ...project.settings,
                    aspectRatio: e.target.value as VideoProject["settings"]["aspectRatio"],
                  },
                })
              }
            >
              {MEDIA_STUDIO_VIDEO_CAPABILITIES.aspects.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Duration (per scene)</span>
            <select
              className="input-surface mt-1 w-full"
              value={project.settings.durationSec}
              onChange={(e) =>
                persist({
                  ...project,
                  settings: {
                    ...project.settings,
                    durationSec: Number(e.target.value) as VideoProject["settings"]["durationSec"],
                  },
                })
              }
            >
              {MEDIA_STUDIO_VIDEO_CAPABILITIES.durationsSec.map((d) => (
                <option key={d} value={d}>
                  {d}s · {mediaVideoCreditCost(d as 5 | 10 | 15)} credits
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Resolution</span>
            <select
              className="input-surface mt-1 w-full"
              value={project.settings.resolution}
              onChange={(e) =>
                persist({
                  ...project,
                  settings: {
                    ...project.settings,
                    resolution: e.target.value as "720p" | "1080p",
                  },
                })
              }
            >
              {MEDIA_STUDIO_VIDEO_CAPABILITIES.resolutions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Camera movement</span>
            <select
              className="input-surface mt-1 w-full"
              value={project.settings.cameraMovement}
              onChange={(e) =>
                persist({
                  ...project,
                  settings: {
                    ...project.settings,
                    cameraMovement: e.target.value as CameraMovementId,
                  },
                })
              }
            >
              {CAMERA_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Lighting</span>
            <select
              className="input-surface mt-1 w-full"
              value={project.settings.lighting}
              onChange={(e) =>
                persist({
                  ...project,
                  settings: { ...project.settings, lighting: e.target.value as LightingStyleId },
                })
              }
            >
              {LIGHTING_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Visual style</span>
            <select
              className="input-surface mt-1 w-full"
              value={project.settings.visualStyle}
              onChange={(e) =>
                persist({
                  ...project,
                  settings: { ...project.settings, visualStyle: e.target.value as VisualStyleId },
                })
              }
            >
              {STYLE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXPORT_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => persist(applyExportPresetToProject(project, preset.id))}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        {project.scenes.length > 0 && (
          <p className="text-sm text-muted">
            Estimated credits: <strong>{estimatedCredits}</strong> ({project.scenes.length} scenes ×{" "}
            {costPerScene} credits)
          </p>
        )}
      </section>

      <section className="saas-card space-y-4 p-4 sm:p-6">
        <h2 className="text-lg font-semibold">3. Scenes</h2>
        {sortedScenes.length === 0 ? (
          <p className="text-sm text-muted">Run Scene Director or add a scene to begin.</p>
        ) : (
          <ul className="space-y-3">
            {sortedScenes.map((scene, index) => (
              <li
                key={scene.id}
                className={cn(
                  "rounded-xl border p-3",
                  "border-border"
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted" aria-hidden />
                  <span className="text-xs font-semibold uppercase text-muted">Scene {index + 1}</span>
                  {scene.locked && <Lock className="h-3.5 w-3.5 text-muted" aria-label="Locked" />}
                  <span
                    className={cn(
                      "ml-auto rounded-full px-2 py-0.5 text-xs font-medium",
                      scene.status === "succeeded" && "bg-emerald-100 text-emerald-800",
                      scene.status === "failed" && "bg-red-100 text-red-800",
                      scene.status === "generating" && "bg-amber-100 text-amber-900",
                      scene.status === "idle" && "bg-zinc-100 text-zinc-700"
                    )}
                  >
                    {scene.status}
                  </span>
                </div>
                <input
                  className="input-surface mt-2 w-full font-medium"
                  value={scene.title}
                  disabled={scene.locked}
                  onChange={(e) => updateScene(scene.id, { title: e.target.value })}
                />
                <textarea
                  className="input-surface mt-2 w-full text-sm"
                  rows={2}
                  value={scene.prompt}
                  disabled={scene.locked}
                  onChange={(e) => updateScene(scene.id, { prompt: e.target.value })}
                />
                {scene.outputUrl && (
                  <video
                    src={scene.outputUrl}
                    controls
                    playsInline
                    className="mt-3 max-h-48 w-full rounded-lg bg-black object-contain"
                  />
                )}
                {scene.previousOutputUrl && compareSceneId === scene.id && (
                  <video
                    src={scene.previousOutputUrl}
                    controls
                    playsInline
                    className="mt-2 max-h-32 w-full rounded-lg border border-dashed border-muted object-contain opacity-80"
                  />
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="min-h-10"
                    disabled={!canAfford || scene.locked || scene.status === "generating"}
                    onClick={() => void generateScene(scene)}
                  >
                    {scene.status === "generating" ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Clapperboard className="mr-1 h-4 w-4" />
                    )}
                    Generate scene
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={scene.locked}
                    onClick={() => void generateScene(scene, "improve_quality")}
                  >
                    Improve quality
                  </Button>
                  {scene.previousOutputUrl && scene.outputUrl && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setCompareSceneId(compareSceneId === scene.id ? null : scene.id)
                        }
                      >
                        Compare
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateScene(scene.id, {
                            outputUrl: scene.previousOutputUrl,
                            previousOutputUrl: scene.outputUrl,
                          })
                        }
                      >
                        Keep original
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => updateScene(scene.id, { locked: !scene.locked })}
                  >
                    {scene.locked ? "Unlock" : "Lock"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={index === 0}
                    onClick={() =>
                      persist({ ...project, scenes: reorderScenes(project.scenes, index, index - 1) })
                    }
                  >
                    Up
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={index === sortedScenes.length - 1}
                    onClick={() =>
                      persist({ ...project, scenes: reorderScenes(project.scenes, index, index + 1) })
                    }
                  >
                    Down
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      persist({
                        ...project,
                        scenes: [
                          ...project.scenes.slice(0, index + 1),
                          duplicateScene(scene, index + 1),
                          ...project.scenes.slice(index + 1).map((s) => ({ ...s, order: s.order + 1 })),
                        ],
                      })
                    }
                  >
                    Duplicate
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-red-600"
                    disabled={scene.locked}
                    onClick={() =>
                      persist({
                        ...project,
                        scenes: project.scenes.filter((s) => s.id !== scene.id),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {scene.errorMessage && (
                  <p className="mt-2 text-sm text-red-600">{scene.errorMessage}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="saas-card space-y-4 p-4 sm:p-6">
        <h2 className="text-lg font-semibold">4. Exact text overlays</h2>
        <p className="text-sm text-muted">
          Important readable text is rendered here — not by the video model. Your text is preserved
          exactly for export in GigaEdit.
        </p>
        {project.textOverlays.map((layer) => (
          <div key={layer.id} className="rounded-xl border border-border p-3">
            <div className="flex flex-wrap gap-2 text-xs uppercase text-muted">
              <span>{layer.kind}</span>
              {layer.locked && <span>locked</span>}
            </div>
            <input
              className="input-surface mt-2 w-full text-lg font-bold"
              value={layer.text}
              onChange={(e) =>
                persist({
                  ...project,
                  textOverlays: project.textOverlays.map((o) =>
                    o.id === layer.id ? { ...o, text: e.target.value } : o
                  ),
                })
              }
            />
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            persist({
              ...project,
              textOverlays: [
                ...project.textOverlays,
                createTextOverlay({ kind: "title", text: "YOUR TITLE HERE" }),
              ],
            })
          }
        >
          Add title overlay
        </Button>
      </section>

      <section className="saas-card space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">5. Quality check</h2>
          <Button type="button" variant="outline" onClick={runQualityCheck} className="min-h-11 gap-2">
            <Sparkles className="h-4 w-4" aria-hidden />
            Run check
          </Button>
        </div>
        <p
          className={cn(
            "rounded-xl px-4 py-3 text-center text-sm font-bold uppercase tracking-wide",
            qualityReport.ready
              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
              : "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100"
          )}
        >
          {qualityReport.headline}
        </p>
        <ul className="space-y-2 text-sm">
          {qualityReport.items.map((item) => (
            <li key={item.id} className="flex gap-2">
              {item.severity === "error" ? (
                <span className="text-red-600">✕</span>
              ) : item.severity === "warning" ? (
                <span className="text-amber-600">!</span>
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-muted" />
              )}
              <span>{item.message}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">{qualityReport.disclaimer}</p>
      </section>

      <section className="saas-card flex flex-col gap-3 p-4 sm:flex-row sm:p-6">
        <Link href={gigaEditHandoffHref(project)} className="inline-flex flex-1">
          <Button type="button" className="min-h-12 w-full gap-2 text-base" disabled={!sortedScenes.some((s) => s.outputUrl)}>
            Open in GigaEdit (timeline, captions, audio)
          </Button>
        </Link>
        <p className="text-xs text-muted sm:max-w-xs">
          Polish in GigaEdit: multi-track timeline, captions, voiceover, music, and social export.
          Save each scene clip first if remote import is blocked by your browser.
        </p>
      </section>
    </div>
  );
}
