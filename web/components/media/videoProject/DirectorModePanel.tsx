"use client";

import { Button } from "@/components/ui/Button";
import {
  buildDirectorPlanFromIdea,
  estimateDirectorPlanCredits,
  formatDirectorPlanSummary,
  MEDIA_STUDIO_VIDEO_CAPABILITIES,
  syncProjectFromDirectorPlan,
  updateDirectorPlanScene,
  type DirectorProductionPlan,
  type VideoProject,
} from "@/lib/media/videoProject";
import { mediaVideoCreditCost } from "@/lib/media/videoCredits";
import { cn } from "@/lib/utils";
import { Clapperboard, Film, Pencil, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

const CAMERA_OPTIONS = [
  { id: "aerial", label: "Aerial slow push" },
  { id: "tracking", label: "Tracking shot" },
  { id: "crane", label: "Crane shot" },
  { id: "pull_out", label: "Cinematic pull-out" },
  { id: "slow_push_in", label: "Slow push-in" },
  { id: "cinematic", label: "Cinematic" },
  { id: "drone", label: "Drone" },
  { id: "handheld", label: "Handheld" },
] as const;

type DirectorModePanelProps = {
  project: VideoProject;
  onChange: (next: VideoProject) => void;
  onGenerateAll: () => void;
  onGenerateSceneByScene: () => void;
  generating: boolean;
  creditsAvailable: number | null;
};

export function DirectorModePanel({
  project,
  onChange,
  onGenerateAll,
  onGenerateSceneByScene,
  generating,
  creditsAvailable,
}: DirectorModePanelProps) {
  const [planEditing, setPlanEditing] = useState(true);
  const plan = project.directorPlan;

  const estimatedCredits = useMemo(
    () =>
      plan ? estimateDirectorPlanCredits(plan, mediaVideoCreditCost) : 0,
    [plan]
  );

  const createPlan = () => {
    const idea = project.sourceIdea.trim();
    if (!idea) return;
    const nextPlan = buildDirectorPlanFromIdea({ sourceIdea: idea });
    onChange(
      syncProjectFromDirectorPlan({
        ...project,
        sourceIdea: idea,
        masterPrompt: idea,
        directorMode: true,
        directorPlan: nextPlan,
      })
    );
    setPlanEditing(true);
  };

  const patchPlan = (nextPlan: DirectorProductionPlan) => {
    const synced = syncProjectFromDirectorPlan({
      ...project,
      directorPlan: nextPlan,
    });
    onChange(synced);
  };

  return (
    <section className="saas-card space-y-4 p-4 sm:p-6" data-testid="director-mode-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Film className="h-5 w-5 text-violet-600" aria-hidden />
            Giga3 AI Director Mode
          </h2>
          <p className="mt-1 text-sm text-muted">
            Turn a simple idea into a structured production plan. Your core idea stays exactly as
            you wrote it — the plan is a suggestion you can edit before generating.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={project.directorMode}
            onChange={(e) =>
              onChange({
                ...project,
                directorMode: e.target.checked,
                directorPlan: e.target.checked ? project.directorPlan : null,
              })
            }
            className="h-4 w-4 rounded border-border"
          />
          Director Mode
        </label>
      </div>

      {project.directorMode && (
        <>
          <label className="block">
            <span className="text-sm font-bold uppercase tracking-wide text-muted">Your idea</span>
            <textarea
              value={project.sourceIdea}
              onChange={(e) =>
                onChange({
                  ...project,
                  sourceIdea: e.target.value,
                  masterPrompt: e.target.value,
                })
              }
              rows={3}
              className="input-surface mt-2 sm:text-lg"
              placeholder="Ghana in 2050 — show what Accra might look like."
            />
            <p className="mt-1 text-xs text-muted">
              This is your core concept. Director Mode will not rewrite it automatically.
            </p>
          </label>

          <Button type="button" onClick={createPlan} className="min-h-11 gap-2">
            <Sparkles className="h-4 w-4" aria-hidden />
            Create production plan
          </Button>

          {plan && (
            <>
              <div className="rounded-xl border border-violet-200/60 bg-violet-50/40 p-4 dark:border-violet-500/20 dark:bg-violet-950/20">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-violet-800 dark:text-violet-200">
                    Production plan
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => setPlanEditing((v) => !v)}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    {planEditing ? "Preview plan" : "Edit plan"}
                  </Button>
                </div>

                {planEditing ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm sm:col-span-2">
                      <span className="font-semibold uppercase text-muted">Title</span>
                      <input
                        className="input-surface mt-1 w-full font-medium"
                        value={plan.title}
                        onChange={(e) =>
                          patchPlan({ ...plan, title: e.target.value })
                        }
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="font-semibold uppercase text-muted">Format</span>
                      <select
                        className="input-surface mt-1 w-full"
                        value={plan.format}
                        onChange={(e) =>
                          patchPlan({
                            ...plan,
                            format: e.target.value as DirectorProductionPlan["format"],
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
                      <span className="font-semibold uppercase text-muted">Visual style</span>
                      <input
                        className="input-surface mt-1 w-full"
                        value={plan.visualStyleLabel}
                        onChange={(e) =>
                          patchPlan({ ...plan, visualStyleLabel: e.target.value })
                        }
                      />
                    </label>
                    <p className="text-sm sm:col-span-2">
                      <span className="font-semibold uppercase text-muted">Duration</span>
                      <span className="mt-1 block text-lg font-medium">
                        {plan.totalDurationSec} seconds
                      </span>
                      <span className="text-xs text-muted">
                        {plan.scenes.length} scenes × {plan.scenes[0]?.durationSec ?? 5}s each
                        (provider supports 5/10/15s per clip)
                      </span>
                    </p>

                    <div className="space-y-4 sm:col-span-2">
                      <p className="text-sm font-semibold uppercase text-muted">Scenes</p>
                      {plan.scenes.map((scene, index) => (
                        <div
                          key={scene.id}
                          className="rounded-xl border border-border bg-white/60 p-3 dark:bg-zinc-900/40"
                        >
                          <p className="text-xs font-bold tracking-wide text-violet-700 dark:text-violet-300">
                            {String(index + 1).padStart(2, "0")} — {scene.slug}
                          </p>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            <label className="text-sm">
                              Duration (sec)
                              <select
                                className="input-surface mt-1 w-full"
                                value={scene.durationSec}
                                onChange={(e) =>
                                  patchPlan(
                                    updateDirectorPlanScene(plan, scene.id, {
                                      durationSec: Number(e.target.value) as 5 | 10 | 15,
                                    })
                                  )
                                }
                              >
                                {MEDIA_STUDIO_VIDEO_CAPABILITIES.durationsSec.map((d) => (
                                  <option key={d} value={d}>
                                    {d}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="text-sm">
                              Camera
                              <select
                                className="input-surface mt-1 w-full"
                                value={scene.cameraMovement}
                                onChange={(e) => {
                                  const movement = e.target.value as typeof scene.cameraMovement;
                                  const label =
                                    CAMERA_OPTIONS.find((c) => c.id === movement)?.label ??
                                    movement;
                                  patchPlan(
                                    updateDirectorPlanScene(plan, scene.id, {
                                      cameraMovement: movement,
                                      cameraLabel: label,
                                    })
                                  );
                                }}
                              >
                                {CAMERA_OPTIONS.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="text-sm sm:col-span-2">
                              Description
                              <textarea
                                className="input-surface mt-1 w-full"
                                rows={2}
                                value={scene.description}
                                onChange={(e) =>
                                  patchPlan(
                                    updateDirectorPlanScene(plan, scene.id, {
                                      description: e.target.value,
                                    })
                                  )
                                }
                              />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                    {formatDirectorPlanSummary(plan)}
                  </pre>
                )}

                <p className="mt-3 rounded-lg border border-border bg-white/50 px-3 py-2 text-xs text-muted dark:bg-zinc-900/30">
                  Core idea preserved: &ldquo;{project.sourceIdea.trim()}&rdquo;
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  className="min-h-12 flex-1 gap-2 text-base"
                  disabled={
                    generating ||
                    (creditsAvailable !== null && creditsAvailable < estimatedCredits)
                  }
                  onClick={onGenerateAll}
                >
                  <Clapperboard className="h-5 w-5" aria-hidden />
                  Generate all
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-12 flex-1 text-base"
                  onClick={onGenerateSceneByScene}
                >
                  Generate scene-by-scene
                </Button>
              </div>
              <p className="text-sm text-muted">
                Estimated credits: <strong>{estimatedCredits}</strong>
                {creditsAvailable !== null && (
                  <> · Available: {creditsAvailable}</>
                )}
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}
