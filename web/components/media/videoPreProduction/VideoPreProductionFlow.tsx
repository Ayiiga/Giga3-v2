"use client";

import { GenerationProgressStrip } from "@/components/generation/GenerationProgressStrip";
import { MessageMediaBlock } from "@/components/chat/MessageMediaBlock";
import { Button } from "@/components/ui/Button";
import { CreditPromptBanner } from "@/components/billing/CreditPromptBanner";
import type { UsageSnapshot } from "@/lib/credits/constants";
import { getSessionToken } from "@/lib/auth";
import { buildPreProductionVideoPrompt } from "@/lib/media/videoPreProduction/buildVideoPrompt";
import {
  loadPreProductionDraft,
  savePreProductionDraft,
} from "@/lib/media/videoPreProduction/draftStorage";
import {
  beginPreProdRequest,
  completePreProdRequest,
  newPreProdNonce,
} from "@/lib/media/videoPreProduction/idempotency";
import {
  countWords,
  estimateSpeechDurationSec,
  splitScriptIntoScenes,
} from "@/lib/media/videoPreProduction/scriptUtils";
import {
  isBrowserVoiceoverSupported,
  listBrowserVoices,
  playVoiceoverPreview,
  stopVoiceoverPreview,
  type BrowserVoiceOption,
} from "@/lib/media/videoPreProduction/browserVoiceover";
import {
  createEmptyDraft,
  type PreProductionStep,
  type VideoPreProductionDraft,
} from "@/lib/media/videoPreProduction/types";
import { VIDEO_CATEGORIES, type VideoCategoryId } from "@/lib/media/catalog";
import { mediaVideoCreditCost } from "@/lib/media/videoCredits";
import {
  MEDIA_VIDEO_DURATION_OPTIONS,
  type MediaVideoDurationSec,
} from "@/lib/media/videoLimits";
import { useMediaGeneration } from "@/hooks/useMediaGeneration";
import { useMediaVideoJob } from "@/hooks/useMediaVideoJob";
import { progressForStage, providerDisplayName } from "@/lib/media/stableJobs";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import {
  CheckCircle2,
  Clapperboard,
  Loader2,
  Mic,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Upload,
  XCircle,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

const STEPS: { id: PreProductionStep; label: string }[] = [
  { id: "idea", label: "Script" },
  { id: "script", label: "Review" },
  { id: "voiceover", label: "Voiceover" },
  { id: "visuals", label: "Visuals" },
  { id: "generate", label: "Generate" },
  { id: "preview", label: "Preview" },
];

const WRITING_CREDIT_COST = 2;

type VideoPreProductionFlowProps = {
  usage: UsageSnapshot | null;
};

export const VideoPreProductionFlow = memo(function VideoPreProductionFlow({
  usage,
}: VideoPreProductionFlowProps) {
  const [draft, setDraft] = useState<VideoPreProductionDraft>(() => loadPreProductionDraft());
  const [voices, setVoices] = useState<BrowserVoiceOption[]>([]);
  const [scriptBusy, setScriptBusy] = useState(false);
  const [rewriteBusy, setRewriteBusy] = useState(false);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [videoSubmitting, setVideoSubmitting] = useState(false);
  const scriptRequestRef = useRef<string | null>(null);

  const generateScript = useAction(api.mediaVideoScript.generateVideoScript);
  const rewriteScript = useAction(api.mediaVideoScript.rewriteVideoScript);
  const { createVideo, resolveVideoJob, error: videoError, clearStatus } = useMediaGeneration();
  const videoJob = useMediaVideoJob();

  const patchDraft = useCallback((patch: Partial<VideoPreProductionDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch, updatedAt: Date.now() };
      savePreProductionDraft(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isBrowserVoiceoverSupported()) return;
    const sync = () => setVoices(listBrowserVoices());
    sync();
    window.speechSynthesis.onvoiceschanged = sync;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const wordCount = countWords(draft.workingScript);
  const durationEst = estimateSpeechDurationSec(draft.workingScript);
  const videoCreditCost = mediaVideoCreditCost(draft.durationSec);
  const canAffordScript = (usage?.credits ?? 0) >= WRITING_CREDIT_COST;
  const canAffordVideo = (usage?.credits ?? 0) >= videoCreditCost;

  const stepIndex = STEPS.findIndex((s) => s.id === draft.step);

  const handleGenerateScript = useCallback(async () => {
    const idea = draft.idea.trim();
    if (!idea || scriptBusy) return;
    const token = getSessionToken();
    if (!token) {
      setScriptError("Sign in to generate a script.");
      return;
    }
    const nonce = newPreProdNonce();
    if (!beginPreProdRequest("script", nonce)) return;
    scriptRequestRef.current = nonce;
    setScriptBusy(true);
    setScriptError(null);
    try {
      const result = await generateScript({
        sessionToken: token,
        idea,
        clientRequestId: nonce,
      });
      patchDraft({
        originalScript: result.script,
        workingScript: result.script,
        improvedScript: "",
        scriptApproved: false,
        scenes: splitScriptIntoScenes(result.script),
        step: "script",
      });
    } catch (err) {
      setScriptError(err instanceof Error ? err.message : "Script generation failed.");
    } finally {
      completePreProdRequest("script", nonce);
      scriptRequestRef.current = null;
      setScriptBusy(false);
    }
  }, [draft.idea, generateScript, patchDraft, scriptBusy]);

  const handleRewriteScript = useCallback(async () => {
    const current = draft.workingScript.trim();
    if (!current || rewriteBusy) return;
    const token = getSessionToken();
    if (!token) {
      setScriptError("Sign in to rewrite the script.");
      return;
    }
    const nonce = newPreProdNonce();
    if (!beginPreProdRequest("rewrite", nonce)) return;
    setRewriteBusy(true);
    setScriptError(null);
    try {
      const result = await rewriteScript({
        sessionToken: token,
        originalScript: current,
        idea: draft.idea,
        clientRequestId: nonce,
      });
      patchDraft({
        originalScript: draft.originalScript || current,
        improvedScript: result.script,
        workingScript: result.script,
        scriptApproved: false,
        scenes: splitScriptIntoScenes(result.script),
      });
    } catch (err) {
      setScriptError(err instanceof Error ? err.message : "Rewrite failed. Your script is safe.");
    } finally {
      completePreProdRequest("rewrite", nonce);
      setRewriteBusy(false);
    }
  }, [draft.idea, draft.originalScript, draft.workingScript, patchDraft, rewriteBusy, rewriteScript]);

  const handleApproveScript = useCallback(() => {
    const text = draft.workingScript.trim();
    if (!text) return;
    patchDraft({
      scriptApproved: true,
      scenes: splitScriptIntoScenes(text),
      step: "voiceover",
    });
  }, [draft.workingScript, patchDraft]);

  const handleApproveVoiceover = useCallback(() => {
    patchDraft({ voiceoverApproved: true, step: "visuals" });
    stopVoiceoverPreview();
    setVoicePlaying(false);
  }, [patchDraft]);

  const handlePickImage = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      patchDraft({ optionalImageUrls: [...draft.optionalImageUrls, url].slice(0, 6) });
    },
    [draft.optionalImageUrls, patchDraft]
  );

  const submitVideo = useCallback(async () => {
    if (!draft.scriptApproved || !draft.voiceoverApproved || videoSubmitting) return;
    const token = getSessionToken();
    if (!token) return;
    const nonce = newPreProdNonce();
    if (!beginPreProdRequest("video", nonce)) return;

    setVideoSubmitting(true);
    videoJob.clear();
    clearStatus();

    const prompt = buildPreProductionVideoPrompt({
      approvedScript: draft.workingScript,
      scenes: draft.scenes,
      voiceover: draft.voiceover,
    });
    const sourceImage = draft.optionalImageUrls.find((u) => /^https?:\/\//i.test(u));

    try {
      const result = await createVideo(
        draft.videoCategory as VideoCategoryId,
        prompt,
        sourceImage,
        {
          aspectRatio: draft.aspectRatio,
          duration: draft.durationSec,
          resolution: draft.quality,
          generateAudio: true,
        }
      );
      if (result?.jobId) {
        videoJob.track(result.jobId);
        patchDraft({ step: "preview", lastJobId: String(result.jobId) });
      }
    } finally {
      completePreProdRequest("video", nonce);
      setVideoSubmitting(false);
    }
  }, [
    clearStatus,
    createVideo,
    draft,
    patchDraft,
    videoJob,
    videoSubmitting,
  ]);

  useEffect(() => {
    const job = videoJob.job;
    if (!job || job.status === "processing") return;
    if (job.status === "succeeded") {
      resolveVideoJob({
        status: "succeeded",
        outputUrl: job.outputUrl,
        prompt: draft.workingScript,
        category: draft.videoCategory,
      });
    } else if (job.status === "failed") {
      resolveVideoJob({ status: "failed", errorMessage: job.errorMessage });
    }
  }, [videoJob.job, resolveVideoJob, draft.workingScript, draft.videoCategory]);

  const processing = videoSubmitting || videoJob.job?.status === "processing";
  const succeeded = videoJob.job?.status === "succeeded" && Boolean(videoJob.job.outputUrl);
  const failed = videoJob.job?.status === "failed" || Boolean(videoError);

  const englishVoices = useMemo(
    () => voices.filter((v) => v.lang.toLowerCase().startsWith("en")),
    [voices]
  );

  return (
    <div className="space-y-5" data-testid="video-preproduction-flow">
      <div className="flex gap-1 overflow-x-auto overscroll-x-contain pb-1">
        {STEPS.map((step, index) => {
          const done = index < stepIndex;
          const active = step.id === draft.step;
          return (
            <div
              key={step.id}
              className={cn(
                "flex min-h-11 shrink-0 items-center gap-1 rounded-full border px-3 text-xs font-semibold",
                active && "border-violet-500/50 bg-violet-600/15 text-foreground",
                done && !active && "border-emerald-500/30 bg-emerald-500/10 text-foreground",
                !active && !done && "border-border text-muted"
              )}
            >
              <span className="tabular-nums">{index + 1}</span>
              <span>{step.label}</span>
            </div>
          );
        })}
      </div>

      {(draft.step === "idea" || draft.step === "script") && (
        <section className="space-y-4" aria-label="Your idea and script">
          <h2 className="text-lg font-bold text-foreground">1. Your idea / script</h2>
          <label className="block">
            <span className="text-sm font-medium text-muted">Video idea or rough script</span>
            <textarea
              value={draft.idea}
              onChange={(e) => patchDraft({ idea: e.target.value, scriptApproved: false })}
              rows={3}
              className="input-surface mt-2"
              placeholder="Promo for a Ghanaian wedding photography brand…"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={scriptBusy || !draft.idea.trim() || !canAffordScript}
              onClick={() => void handleGenerateScript()}
              className="min-h-11"
            >
              {scriptBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden />
              )}
              Generate script
            </Button>
            {!canAffordScript && usage && (
              <CreditPromptBanner
                variant="empty"
                message={`Script generation needs ${WRITING_CREDIT_COST} credits.`}
                creditCost={WRITING_CREDIT_COST}
                subscriptionActive={usage.subscriptionActive}
                compact
              />
            )}
          </div>

          {draft.workingScript && (
            <div className="space-y-3 rounded-2xl border border-border bg-card/50 p-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted">
                2. Review script
              </h3>
              {draft.originalScript && draft.improvedScript && (
                <details className="text-sm text-muted">
                  <summary className="cursor-pointer font-medium text-foreground">
                    View original script (preserved)
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-muted/30 p-3 text-xs">
                    {draft.originalScript}
                  </pre>
                </details>
              )}
              <textarea
                value={draft.workingScript}
                onChange={(e) =>
                  patchDraft({
                    workingScript: e.target.value,
                    scriptApproved: false,
                    scenes: splitScriptIntoScenes(e.target.value),
                  })
                }
                rows={10}
                className="input-surface font-mono text-sm"
                aria-label="Editable script"
              />
              <p className="text-sm text-muted">
                {wordCount} words · ~{durationEst}s spoken
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={rewriteBusy || !canAffordScript}
                  onClick={() => void handleRewriteScript()}
                  className="min-h-11"
                >
                  {rewriteBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <RefreshCw className="h-4 w-4" aria-hidden />
                  )}
                  Rewrite & improve
                </Button>
                <Button
                  type="button"
                  disabled={!draft.workingScript.trim()}
                  onClick={handleApproveScript}
                  className="min-h-11"
                >
                  Approve script
                </Button>
              </div>
            </div>
          )}

          {scriptError && (
            <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {scriptError}
            </p>
          )}
        </section>
      )}

      {draft.step === "voiceover" && (
        <section className="space-y-4" aria-label="Voiceover">
          <h2 className="text-lg font-bold text-foreground">3. Voiceover</h2>
          <p className="text-sm text-muted">
            Preview narration style in your browser. Final synced narration is generated with your
            video using the approved script.
          </p>
          {!isBrowserVoiceoverSupported() && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
              Voice preview is not available in this browser. You can still approve and generate
              video with AI-synced audio.
            </p>
          )}
          <label className="block text-sm font-medium text-muted">
            Voice
            <select
              className="input-surface mt-2 w-full"
              value={draft.voiceover.voiceUri}
              onChange={(e) => {
                const voice = englishVoices.find((v) => v.uri === e.target.value);
                patchDraft({
                  voiceover: {
                    ...draft.voiceover,
                    voiceUri: e.target.value,
                    voiceName: voice?.name ?? "Default",
                    lang: voice?.lang ?? "en",
                  },
                  voiceoverApproved: false,
                });
              }}
            >
              <option value="">System default (English)</option>
              {englishVoices.map((v) => (
                <option key={v.uri} value={v.uri}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-muted">
            Speed
            <input
              type="range"
              min={0.7}
              max={1.3}
              step={0.05}
              value={draft.voiceover.rate}
              onChange={(e) =>
                patchDraft({
                  voiceover: { ...draft.voiceover, rate: Number(e.target.value) },
                  voiceoverApproved: false,
                })
              }
              className="mt-2 w-full"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => {
                if (voicePlaying) {
                  stopVoiceoverPreview();
                  setVoicePlaying(false);
                  return;
                }
                const ok = playVoiceoverPreview({
                  text: draft.workingScript,
                  voiceUri: draft.voiceover.voiceUri,
                  lang: draft.voiceover.lang,
                  rate: draft.voiceover.rate,
                  pitch: draft.voiceover.pitch,
                  onEnd: () => setVoicePlaying(false),
                  onError: (msg) => setScriptError(msg),
                });
                setVoicePlaying(ok);
              }}
            >
              {voicePlaying ? (
                <Pause className="h-4 w-4" aria-hidden />
              ) : (
                <Play className="h-4 w-4" aria-hidden />
              )}
              {voicePlaying ? "Pause preview" : "Play preview"}
            </Button>
            <Button type="button" className="min-h-11" onClick={handleApproveVoiceover}>
              <Mic className="h-4 w-4" aria-hidden />
              Approve voiceover
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            onClick={() => patchDraft({ step: "script" })}
          >
            Back to script
          </Button>
        </section>
      )}

      {draft.step === "visuals" && (
        <section className="space-y-4" aria-label="Visuals">
          <h2 className="text-lg font-bold text-foreground">4. Visuals (optional)</h2>
          <p className="text-sm text-muted">
            Add images from your gallery or continue without images — AI visuals are generated
            from your script.
          </p>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-accent/5">
              <Upload className="h-4 w-4" aria-hidden />
              Add from gallery
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) handlePickImage(file);
                }}
              />
            </label>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => patchDraft({ step: "generate" })}
            >
              Continue without images
            </Button>
          </div>
          {draft.optionalImageUrls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {draft.optionalImageUrls.map((url, i) => (
                <div key={url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover" />
                  <button
                    type="button"
                    aria-label="Remove image"
                    className="absolute -right-1 -top-1 rounded-full bg-red-600 p-1 text-white"
                    onClick={() =>
                      patchDraft({
                        optionalImageUrls: draft.optionalImageUrls.filter((_, j) => j !== i),
                      })
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {draft.scenes.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-border p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Scene plan</p>
              {draft.scenes.map((scene) => (
                <div key={scene.id} className="rounded-xl bg-muted/20 p-3 text-sm">
                  <p className="font-semibold">Scene {scene.sceneNumber}</p>
                  <p className="text-muted">{scene.visualPrompt}</p>
                  <p className="mt-1">{scene.narration}</p>
                </div>
              ))}
            </div>
          )}
          <Button
            type="button"
            className="min-h-11"
            onClick={() => patchDraft({ step: "generate" })}
          >
            Continue to generate
          </Button>
        </section>
      )}

      {draft.step === "generate" && (
        <section className="space-y-4" aria-label="Generate video">
          <h2 className="text-lg font-bold text-foreground">5. Generate video</h2>
          {!draft.scriptApproved && (
            <p className="text-sm text-amber-800 dark:text-amber-100">Approve your script first.</p>
          )}
          {!draft.voiceoverApproved && (
            <p className="text-sm text-amber-800 dark:text-amber-100">Approve voiceover first.</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-muted">
              Style
              <select
                className="input-surface mt-2 w-full"
                value={draft.videoCategory}
                onChange={(e) => patchDraft({ videoCategory: e.target.value })}
              >
                {VIDEO_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-muted">
              Duration
              <select
                className="input-surface mt-2 w-full"
                value={draft.durationSec}
                onChange={(e) =>
                  patchDraft({
                    durationSec: Number(e.target.value) as MediaVideoDurationSec,
                  })
                }
              >
                {MEDIA_VIDEO_DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}s</option>
                ))}
              </select>
            </label>
          </div>
          <p className="rounded-xl border border-border bg-card/50 px-4 py-3 text-sm">
            Estimated cost: <strong>{videoCreditCost} credits</strong>
            {usage ? ` (${usage.credits} available)` : ""}
          </p>
          {!canAffordVideo && usage && (
            <CreditPromptBanner
              variant="empty"
              message={`You need ${videoCreditCost} credits for this ${draft.durationSec}s video.`}
              creditCost={videoCreditCost}
              subscriptionActive={usage.subscriptionActive}
              compact
            />
          )}
          <Button
            type="button"
            disabled={
              processing ||
              !draft.scriptApproved ||
              !draft.voiceoverApproved ||
              !canAffordVideo
            }
            onClick={() => void submitVideo()}
            className="min-h-12 w-full sm:w-auto"
          >
            {processing ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <Clapperboard className="h-5 w-5" aria-hidden />
            )}
            Generate video
          </Button>
          {failed && (
            <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              Video generation could not be completed. Your script and voiceover settings are
              saved. {videoJob.job?.errorMessage || videoError}
              <Button
                type="button"
                variant="outline"
                className="mt-3 min-h-11"
                onClick={() => void submitVideo()}
              >
                Retry video only
              </Button>
            </p>
          )}
        </section>
      )}

      {draft.step === "preview" && (
        <section className="space-y-4" aria-label="Preview and export">
          <h2 className="text-lg font-bold text-foreground">6. Preview & export</h2>
          {processing && (
            <GenerationProgressStrip
              label={
                videoJob.job?.progressLabel
                  ? `${videoJob.job.progressLabel} · ${providerDisplayName(videoJob.job?.provider)}`
                  : "Creating your video…"
              }
              progress={progressForStage(videoJob.job?.progressStage)}
              state="processing"
            />
          )}
          {succeeded && videoJob.job?.outputUrl && (
            <>
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-200">
                <CheckCircle2 className="h-5 w-5" aria-hidden />
                Video ready
              </div>
              <MessageMediaBlock url={videoJob.job.outputUrl} kind="video" />
            </>
          )}
          {failed && !processing && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <span>
                {videoJob.job?.errorMessage || videoError || "Generation failed."}
              </span>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => patchDraft({ step: "generate" })}
            >
              Back to generate
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              onClick={() => {
                const empty = createEmptyDraft();
                setDraft(empty);
                savePreProductionDraft(empty);
                videoJob.clear();
                clearStatus();
              }}
            >
              Start new project
            </Button>
          </div>
        </section>
      )}
    </div>
  );
});
