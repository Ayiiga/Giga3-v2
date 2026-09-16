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
  buildPreProductionScenePrompt,
  clipDurationForGeneration,
  createSceneJobsFromScenes,
  extractCharacterContext,
  formatTargetDurationLabel,
  planLongVideoScenes,
  sceneCountForTargetDuration,
  TARGET_VIDEO_DURATION_OPTIONS,
} from "@/lib/media/videoPreProduction/longVideo";
import { estimateLegacyVideoCredits, formatQualityLabel } from "@/lib/media/videoPreProduction/videoCreditPricing";
import {
  countWords,
  estimateSpeechDurationSec,
  splitScriptIntoScenes,
} from "@/lib/media/videoPreProduction/scriptUtils";
import { combineSceneVideos } from "@/lib/media/videoProject/combineScenes";
import { uploadCombinedVideoToGallery } from "@/lib/media/videoProject/uploadCombinedVideo";
import { triggerMediaJobsRefresh } from "@/lib/media/jobsRefresh";
import {
  isBrowserVoiceoverSupported,
  listBrowserVoices,
  playVoiceoverPreview,
  stopVoiceoverPreview,
  type BrowserVoiceOption,
} from "@/lib/media/videoPreProduction/browserVoiceover";
import {
  PREPROD_IMAGE_UPLOAD_FAILED,
  PREPROD_REWRITE_FAILED,
  PREPROD_SCRIPT_FAILED,
  PREPROD_VIDEO_FAILED,
  PREPROD_VOICEOVER_FAILED,
  toPreProdUserError,
} from "@/lib/media/videoPreProduction/errors";
import {
  addOptionalImageUrl,
  assignSceneImages,
  isHttpsImageUrl,
  pickSourceImageUrl,
  removeOptionalImageUrl,
  replaceOptionalImageUrl,
  resolveSceneSourceImage,
} from "@/lib/media/videoPreProduction/optionalImages";
import { uploadPreProductionReferenceImage } from "@/lib/media/videoPreProduction/uploadReferenceImage";
import {
  filterVoicesByLanguage,
  languageLabel,
  listVoiceLanguages,
  VOICE_STYLE_PRESETS,
} from "@/lib/media/videoPreProduction/voiceOptions";
import { OptionalImagesPanel } from "@/components/media/videoPreProduction/OptionalImagesPanel";
import {
  createEmptyDraft,
  type PreProductionScene,
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
import { useAction, useConvex, useQuery } from "convex/react";
import {
  CheckCircle2,
  Clapperboard,
  Loader2,
  Mic,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
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
  recentImageUrls?: string[];
};

export const VideoPreProductionFlow = memo(function VideoPreProductionFlow({
  usage,
  recentImageUrls = [],
}: VideoPreProductionFlowProps) {
  const [draft, setDraft] = useState<VideoPreProductionDraft>(() => loadPreProductionDraft());
  const [voices, setVoices] = useState<BrowserVoiceOption[]>([]);
  const [scriptBusy, setScriptBusy] = useState(false);
  const [rewriteBusy, setRewriteBusy] = useState(false);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [voiceoverError, setVoiceoverError] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [scriptView, setScriptView] = useState<"working" | "original" | "improved">("working");
  const [voiceLang, setVoiceLang] = useState("en");
  const [videoSubmitting, setVideoSubmitting] = useState(false);
  const scriptRequestRef = useRef<string | null>(null);

  const convex = useConvex();
  const generateScript = useAction(api.mediaVideoScript.generateVideoScript);
  const rewriteScript = useAction(api.mediaVideoScript.rewriteVideoScript);
  const { createVideo, resolveVideoJob, error: videoError, clearStatus } = useMediaGeneration();
  const videoJob = useMediaVideoJob();
  const batchQueueRef = useRef<string[]>([]);
  const generatingSceneRef = useRef<{ sceneId: string; nonce: string } | null>(null);
  const combineAbortRef = useRef<AbortController | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const [combineProgress, setCombineProgress] = useState(0);

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
  const sceneCount = sceneCountForTargetDuration(draft.targetDurationSec);
  const clipDurationSec = clipDurationForGeneration(
    sceneCount === 1 ? draft.durationSec : 15
  );
  const hasHttpsImage = Boolean(pickSourceImageUrl(draft.optionalImageUrls));
  const creditQuote = useQuery(api.mediaVideoPricing.estimateVideoProductionCredits, {
    targetDurationSec: draft.targetDurationSec,
    clipDurationSec,
    resolution: draft.quality,
    generateAudio: true,
    hasImage: hasHttpsImage,
    includeScriptCredits: false,
  });
  const legacyVideoCredits = estimateLegacyVideoCredits(draft.targetDurationSec, clipDurationSec);
  const videoCreditCost = creditQuote?.totalCredits ?? legacyVideoCredits;
  const costPerClip = creditQuote
    ? Math.max(1, Math.round(creditQuote.totalCredits / Math.max(1, creditQuote.sceneCount)))
    : mediaVideoCreditCost(clipDurationSec);
  const creditsAvailable = usage?.credits ?? 0;
  const creditsRemaining = creditsAvailable - videoCreditCost;
  const canAffordScript = creditsAvailable >= WRITING_CREDIT_COST;
  const canAffordVideo = creditsAvailable >= videoCreditCost;
  const isLongVideo = sceneCount > 1;
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
      setScriptError(toPreProdUserError(err, PREPROD_SCRIPT_FAILED));
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
      setScriptView("improved");
    } catch (err) {
      setScriptError(toPreProdUserError(err, PREPROD_REWRITE_FAILED));
    } finally {
      completePreProdRequest("rewrite", nonce);
      setRewriteBusy(false);
    }
  }, [draft.idea, draft.originalScript, draft.workingScript, patchDraft, rewriteBusy, rewriteScript]);

  const handleApproveScript = useCallback(() => {
    const text = draft.workingScript.trim();
    if (!text) return;
    const scenes = assignSceneImages(
      splitScriptIntoScenes(text),
      draft.optionalImageUrls
    );
    patchDraft({
      scriptApproved: true,
      scenes,
      step: "voiceover",
    });
    setVoiceoverError(null);
  }, [draft.optionalImageUrls, draft.workingScript, patchDraft]);

  const handleApproveVoiceover = useCallback(() => {
    patchDraft({ voiceoverApproved: true, step: "visuals" });
    stopVoiceoverPreview();
    setVoicePlaying(false);
  }, [patchDraft]);

  const uploadReferenceFile = useCallback(
    async (file: File, replaceIndex?: number) => {
      setImageUploading(true);
      setImageUploadError(null);
      const preview = URL.createObjectURL(file);
      if (replaceIndex === undefined) {
        patchDraft({
          optionalImageUrls: addOptionalImageUrl(draft.optionalImageUrls, preview),
        });
      } else {
        patchDraft({
          optionalImageUrls: replaceOptionalImageUrl(
            draft.optionalImageUrls,
            replaceIndex,
            preview
          ),
        });
      }
      try {
        const httpsUrl = await uploadPreProductionReferenceImage(convex, file);
        setDraft((prev) => {
          const urls = prev.optionalImageUrls.map((url) =>
            url === preview ? httpsUrl : url
          );
          const next = {
            ...prev,
            optionalImageUrls: urls,
            scenes: assignSceneImages(prev.scenes, urls),
            updatedAt: Date.now(),
          };
          savePreProductionDraft(next);
          return next;
        });
      } catch (err) {
        URL.revokeObjectURL(preview);
        setDraft((prev) => {
          const next = {
            ...prev,
            optionalImageUrls: removeOptionalImageUrl(
              prev.optionalImageUrls,
              replaceIndex ?? prev.optionalImageUrls.indexOf(preview)
            ),
            updatedAt: Date.now(),
          };
          savePreProductionDraft(next);
          return next;
        });
        setImageUploadError(toPreProdUserError(err, PREPROD_IMAGE_UPLOAD_FAILED));
      } finally {
        setImageUploading(false);
      }
    },
    [convex, draft.optionalImageUrls, patchDraft]
  );

  const handleAddGalleryImage = useCallback(
    (url: string) => {
      if (!isHttpsImageUrl(url)) return;
      const nextUrls = addOptionalImageUrl(draft.optionalImageUrls, url);
      patchDraft({
        optionalImageUrls: nextUrls,
        scenes: assignSceneImages(draft.scenes, nextUrls),
      });
    },
    [draft.optionalImageUrls, draft.scenes, patchDraft]
  );

  const handleRemoveImage = useCallback(
    (index: number) => {
      const nextUrls = removeOptionalImageUrl(draft.optionalImageUrls, index);
      patchDraft({
        optionalImageUrls: nextUrls,
        scenes: assignSceneImages(draft.scenes, nextUrls),
      });
    },
    [draft.optionalImageUrls, draft.scenes, patchDraft]
  );

  const combineSceneClips = useCallback(
    async (sceneUrls: string[]) => {
      const active = draftRef.current;
      combineAbortRef.current?.abort();
      const controller = new AbortController();
      combineAbortRef.current = controller;
      patchDraft({
        combinedVideoStatus: "combining",
        combinedVideoError: undefined,
        combinedVideoUrl: undefined,
      });
      setCombineProgress(0);

      try {
        const { file, durationSec } = await combineSceneVideos({
          sceneUrls,
          aspectRatio: active.aspectRatio,
          projectTitle: active.idea.trim() || "Giga3 video",
          onProgress: setCombineProgress,
          signal: controller.signal,
        });
        const registered = await uploadCombinedVideoToGallery(convex, file, {
          title: active.idea.trim() || "Giga3 video",
          prompt: active.workingScript,
          aspectRatio: active.aspectRatio,
          durationSec,
        });
        patchDraft({
          combinedVideoStatus: "ready",
          combinedVideoUrl: registered.outputUrl,
          lastJobId: String(registered.jobId),
        });
        triggerMediaJobsRefresh();
        resolveVideoJob({
          status: "succeeded",
          outputUrl: registered.outputUrl,
          prompt: active.workingScript,
          category: active.videoCategory,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        patchDraft({
          combinedVideoStatus: "failed",
          combinedVideoError:
            error instanceof Error ? error.message : "Could not stitch scenes together.",
        });
      } finally {
        if (combineAbortRef.current === controller) {
          combineAbortRef.current = null;
        }
      }
    },
    [convex, patchDraft, resolveVideoJob]
  );

  const generateSceneClip = useCallback(
    async (sceneIndex: number, scenes: PreProductionScene[]) => {
      const active = draftRef.current;
      const scene = scenes[sceneIndex];
      if (!scene) return;
      const nonce = newPreProdNonce();
      generatingSceneRef.current = { sceneId: scene.id, nonce };

      const characterContext = extractCharacterContext(active.workingScript, active.idea);
      const prompt = buildPreProductionScenePrompt({
        scene,
        sceneIndex,
        totalScenes: scenes.length,
        approvedScript: active.workingScript,
        characterContext,
        voiceover: active.voiceover,
      });
      const sourceImage = resolveSceneSourceImage(scene, active.optionalImageUrls);

      const sceneJobs = (active.sceneJobs ?? createSceneJobsFromScenes(scenes)).map((job) =>
        job.id === scene.id
          ? { ...job, status: "generating" as const, errorMessage: undefined }
          : job
      );
      patchDraft({ sceneJobs, step: "preview" });
      videoJob.clear();

      const result = await createVideo(
        active.videoCategory as VideoCategoryId,
        prompt,
        sourceImage,
        {
          aspectRatio: active.aspectRatio,
          duration: clipDurationSec,
          resolution: active.quality,
          generateAudio: true,
        }
      );
      if (result?.jobId) {
        videoJob.track(result.jobId);
        patchDraft({
          sceneJobs: sceneJobs.map((job) =>
            job.id === scene.id ? { ...job, jobId: String(result.jobId) } : job
          ),
        });
      } else {
        generatingSceneRef.current = null;
        patchDraft({
          sceneJobs: sceneJobs.map((job) =>
            job.id === scene.id
              ? { ...job, status: "failed", errorMessage: "Could not start generation." }
              : job
          ),
        });
      }
    },
    [clipDurationSec, createVideo, patchDraft, videoJob]
  );

  const retryFailedScenes = useCallback(async () => {
    const active = draftRef.current;
    const failed = (active.sceneJobs ?? []).filter((job) => job.status === "failed");
    if (!failed.length) return;
    const scenes = active.scenes;
    batchQueueRef.current = failed.map((job) => job.id);
    patchDraft({
      sceneJobs: (active.sceneJobs ?? []).map((job) =>
        job.status === "failed"
          ? { ...job, status: "pending" as const, errorMessage: undefined }
          : job
      ),
      combinedVideoStatus: "idle",
      combinedVideoUrl: undefined,
      combinedVideoError: undefined,
    });
    const firstIndex = scenes.findIndex((scene) => scene.id === failed[0].id);
    if (firstIndex >= 0) {
      await generateSceneClip(firstIndex, scenes);
    }
  }, [generateSceneClip, patchDraft]);

  const submitVideo = useCallback(async () => {
    const active = draftRef.current;
    if (!active.scriptApproved || !active.voiceoverApproved || videoSubmitting) return;
    const token = getSessionToken();
    if (!token) return;
    const nonce = newPreProdNonce();
    if (!beginPreProdRequest("video", nonce)) return;

    setVideoSubmitting(true);
    videoJob.clear();
    clearStatus();

    const scenes = assignSceneImages(
      planLongVideoScenes(active.workingScript, active.targetDurationSec),
      active.optionalImageUrls
    );
    const sceneJobs = createSceneJobsFromScenes(scenes);
    patchDraft({
      scenes,
      sceneJobs,
      combinedVideoStatus: "idle",
      combinedVideoUrl: undefined,
      combinedVideoError: undefined,
    });

    try {
      if (scenes.length === 1) {
        const prompt = buildPreProductionVideoPrompt({
          approvedScript: active.workingScript,
          scenes,
          voiceover: active.voiceover,
        });
        const sourceImage = resolveSceneSourceImage(scenes[0], active.optionalImageUrls);
        const result = await createVideo(
          active.videoCategory as VideoCategoryId,
          prompt,
          sourceImage,
          {
            aspectRatio: active.aspectRatio,
            duration: active.durationSec,
            resolution: active.quality,
            generateAudio: true,
          }
        );
        if (result?.jobId) {
          videoJob.track(result.jobId);
          patchDraft({ step: "preview", lastJobId: String(result.jobId) });
        }
      } else {
        batchQueueRef.current = scenes.map((s) => s.id);
        patchDraft({ step: "preview" });
        await generateSceneClip(0, scenes);
      }
    } finally {
      completePreProdRequest("video", nonce);
      setVideoSubmitting(false);
    }
  }, [clearStatus, createVideo, generateSceneClip, patchDraft, videoJob, videoSubmitting]);

  useEffect(() => {
    const job = videoJob.job;
    const gen = generatingSceneRef.current;
    if (!job || job.status === "processing") return;

    if (gen) {
      const active = draftRef.current;
      const scenes = active.scenes;
      const sceneJobs = (active.sceneJobs ?? []).map((entry) => {
        if (entry.id !== gen.sceneId) return entry;
        if (job.status === "succeeded") {
          return {
            ...entry,
            status: "succeeded" as const,
            outputUrl: job.outputUrl,
            jobId: job.jobId,
            creditsCharged: costPerClip,
            errorMessage: undefined,
          };
        }
        return {
          ...entry,
          status: "failed" as const,
          errorMessage: job.errorMessage ?? "Generation failed",
        };
      });
      patchDraft({ sceneJobs });
      generatingSceneRef.current = null;

      if (job.status === "succeeded") {
        batchQueueRef.current = batchQueueRef.current.filter((id) => id !== gen.sceneId);
        const nextId = batchQueueRef.current[0];
        if (nextId) {
          const nextIndex = scenes.findIndex((s) => s.id === nextId);
          window.setTimeout(() => {
            void generateSceneClip(nextIndex, scenes);
          }, 400);
        } else {
          const urls = sceneJobs
            .filter((entry) => entry.status === "succeeded" && entry.outputUrl)
            .sort((a, b) => a.sceneNumber - b.sceneNumber)
            .map((entry) => entry.outputUrl as string);
          if (urls.length === scenes.length) {
            void combineSceneClips(urls);
          }
        }
      }
      return;
    }

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
  }, [
    combineSceneClips,
    costPerClip,
    draft.videoCategory,
    draft.workingScript,
    generateSceneClip,
    patchDraft,
    resolveVideoJob,
    videoJob.job,
  ]);

  useEffect(() => {
    return () => combineAbortRef.current?.abort();
  }, []);

  const sceneJobs = draft.sceneJobs ?? [];
  const completedScenes = sceneJobs.filter((job) => job.status === "succeeded").length;
  const failedScenes = sceneJobs.filter((job) => job.status === "failed");
  const combining = draft.combinedVideoStatus === "combining";
  const processing =
    videoSubmitting ||
    videoJob.job?.status === "processing" ||
    combining ||
    (isLongVideo && sceneJobs.some((job) => job.status === "generating"));
  const succeeded =
    draft.combinedVideoStatus === "ready" && Boolean(draft.combinedVideoUrl)
      ? true
      : !isLongVideo && videoJob.job?.status === "succeeded" && Boolean(videoJob.job.outputUrl);
  const failed =
    draft.combinedVideoStatus === "failed" ||
    failedScenes.length > 0 ||
    (!isLongVideo && (videoJob.job?.status === "failed" || Boolean(videoError)));
  const previewUrl = draft.combinedVideoUrl ?? videoJob.job?.outputUrl;

  const voiceLanguages = useMemo(() => listVoiceLanguages(voices), [voices]);
  const filteredVoices = useMemo(
    () => filterVoicesByLanguage(voices, voiceLang),
    [voices, voiceLang]
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
              {(draft.originalScript || draft.improvedScript) && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={cn(
                      "min-h-11 rounded-full border px-3 py-1.5 text-xs font-semibold",
                      scriptView === "working"
                        ? "border-violet-500/50 bg-violet-600/15"
                        : "border-border text-muted"
                    )}
                    onClick={() => setScriptView("working")}
                  >
                    Working script
                  </button>
                  {draft.originalScript && (
                    <button
                      type="button"
                      className={cn(
                        "min-h-11 rounded-full border px-3 py-1.5 text-xs font-semibold",
                        scriptView === "original"
                          ? "border-violet-500/50 bg-violet-600/15"
                          : "border-border text-muted"
                      )}
                      onClick={() => setScriptView("original")}
                    >
                      Original script
                    </button>
                  )}
                  {draft.improvedScript && (
                    <button
                      type="button"
                      className={cn(
                        "min-h-11 rounded-full border px-3 py-1.5 text-xs font-semibold",
                        scriptView === "improved"
                          ? "border-violet-500/50 bg-violet-600/15"
                          : "border-border text-muted"
                      )}
                      onClick={() => setScriptView("improved")}
                    >
                      Improved script
                    </button>
                  )}
                </div>
              )}
              {scriptView === "original" && draft.originalScript ? (
                <div className="space-y-2">
                  <pre
                    className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl bg-muted/30 p-3 text-sm"
                    data-testid="preprod-original-script"
                  >
                    {draft.originalScript}
                  </pre>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    onClick={() => {
                      patchDraft({
                        workingScript: draft.originalScript,
                        scriptApproved: false,
                        scenes: splitScriptIntoScenes(draft.originalScript),
                      });
                      setScriptView("working");
                    }}
                  >
                    Use original as working script
                  </Button>
                </div>
              ) : scriptView === "improved" && draft.improvedScript ? (
                <div className="space-y-2">
                  <pre
                    className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl bg-muted/30 p-3 text-sm"
                    data-testid="preprod-improved-script"
                  >
                    {draft.improvedScript}
                  </pre>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    onClick={() => {
                      patchDraft({
                        workingScript: draft.improvedScript,
                        scriptApproved: false,
                        scenes: splitScriptIntoScenes(draft.improvedScript),
                      });
                      setScriptView("working");
                    }}
                  >
                    Use improved as working script
                  </Button>
                </div>
              ) : (
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
                  data-testid="preprod-working-script"
                />
              )}
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
            Language
            <select
              className="input-surface mt-2 w-full"
              value={voiceLang}
              onChange={(e) => {
                setVoiceLang(e.target.value);
                patchDraft({ voiceoverApproved: false });
              }}
            >
              {voiceLanguages.map((code) => (
                <option key={code} value={code}>
                  {languageLabel(code)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-muted">
            Voice / accent
            <select
              className="input-surface mt-2 w-full"
              value={draft.voiceover.voiceUri}
              onChange={(e) => {
                const voice = filteredVoices.find((v) => v.uri === e.target.value);
                patchDraft({
                  voiceover: {
                    ...draft.voiceover,
                    voiceUri: e.target.value,
                    voiceName: voice?.name ?? "Default",
                    lang: voice?.lang ?? voiceLang,
                  },
                  voiceoverApproved: false,
                });
              }}
            >
              <option value="">System default</option>
              {filteredVoices.map((v) => (
                <option key={v.uri} value={v.uri}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </label>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-muted">Speaking style</legend>
            <div className="flex flex-wrap gap-2">
              {VOICE_STYLE_PRESETS.map((preset) => {
                const active =
                  draft.voiceover.rate === preset.rate &&
                  draft.voiceover.pitch === preset.pitch;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={cn(
                      "min-h-11 rounded-full border px-3 py-1.5 text-xs font-semibold",
                      active
                        ? "border-violet-500/50 bg-violet-600/15"
                        : "border-border text-muted"
                    )}
                    onClick={() =>
                      patchDraft({
                        voiceover: {
                          ...draft.voiceover,
                          rate: preset.rate,
                          pitch: preset.pitch,
                        },
                        voiceoverApproved: false,
                      })
                    }
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <label className="block text-sm font-medium text-muted">
            Speed ({draft.voiceover.rate.toFixed(2)}×)
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
                  onError: (msg) => setVoiceoverError(msg || PREPROD_VOICEOVER_FAILED),
                });
                setVoicePlaying(ok);
                if (ok) setVoiceoverError(null);
              }}
            >
              {voicePlaying ? (
                <Pause className="h-4 w-4" aria-hidden />
              ) : (
                <Play className="h-4 w-4" aria-hidden />
              )}
              {voicePlaying ? "Pause preview" : "Play preview"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => {
                stopVoiceoverPreview();
                setVoicePlaying(false);
                const ok = playVoiceoverPreview({
                  text: draft.workingScript,
                  voiceUri: draft.voiceover.voiceUri,
                  lang: draft.voiceover.lang,
                  rate: draft.voiceover.rate,
                  pitch: draft.voiceover.pitch,
                  onEnd: () => setVoicePlaying(false),
                  onError: (msg) => setVoiceoverError(msg || PREPROD_VOICEOVER_FAILED),
                });
                setVoicePlaying(ok);
              }}
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Regenerate preview
            </Button>
            <Button type="button" className="min-h-11" onClick={handleApproveVoiceover}>
              <Mic className="h-4 w-4" aria-hidden />
              Approve voiceover
            </Button>
          </div>
          {voiceoverError && (
            <p
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
            >
              {voiceoverError}
            </p>
          )}
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
          <OptionalImagesPanel
            imageUrls={draft.optionalImageUrls}
            recentImageUrls={recentImageUrls}
            uploading={imageUploading}
            onAddFromGallery={handleAddGalleryImage}
            onUploadFile={(file) => void uploadReferenceFile(file)}
            onRemove={handleRemoveImage}
            onReplace={(index, file) => void uploadReferenceFile(file, index)}
            onContinueWithoutImages={() => patchDraft({ step: "generate" })}
          />
          {imageUploadError && (
            <p
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
            >
              {imageUploadError}
            </p>
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
              Total video length
              <select
                className="input-surface mt-2 w-full"
                value={draft.targetDurationSec}
                onChange={(e) => {
                  const targetDurationSec = Number(e.target.value);
                  patchDraft({
                    targetDurationSec,
                    scenes: planLongVideoScenes(draft.workingScript, targetDurationSec),
                  });
                }}
              >
                {TARGET_VIDEO_DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {formatTargetDurationLabel(d)}
                  </option>
                ))}
              </select>
            </label>
            {!isLongVideo && (
              <label className="text-sm font-medium text-muted">
                Clip duration
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
            )}
          </div>
          {isLongVideo && (
            <p className="rounded-xl border border-violet-500/30 bg-violet-600/10 px-4 py-3 text-sm text-foreground">
              Giga3 will generate <strong>{sceneCount} scenes</strong> (15s each) with the same
              character and stitch them into one <strong>{formatTargetDurationLabel(draft.targetDurationSec)}</strong> video
              for download.
            </p>
          )}
          <div
            className="space-y-2 rounded-xl border border-border bg-card/50 px-4 py-3 text-sm"
            data-testid="video-credit-estimate"
          >
            <p className="font-semibold text-foreground">Credit estimate</p>
            <dl className="grid gap-1 sm:grid-cols-2">
              <div>
                <dt className="text-muted">Video length</dt>
                <dd>{formatTargetDurationLabel(draft.targetDurationSec)}</dd>
              </div>
              <div>
                <dt className="text-muted">Provider</dt>
                <dd>fal.ai (primary)</dd>
              </div>
              <div>
                <dt className="text-muted">Model</dt>
                <dd>{creditQuote?.modelLabel ?? "Configured via fal.ai"}</dd>
              </div>
              <div>
                <dt className="text-muted">Quality</dt>
                <dd className="capitalize">
                  {creditQuote?.qualityLabel ?? formatQualityLabel(draft.videoModelTier)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Audio</dt>
                <dd>{creditQuote?.usesNativeAudio ? "Native (on)" : "Synced (on)"}</dd>
              </div>
              {isLongVideo && (
                <div>
                  <dt className="text-muted">Scenes</dt>
                  <dd>{sceneCount}</dd>
                </div>
              )}
              {creditQuote && creditQuote.providerJobsPerScene > 1 && (
                <div>
                  <dt className="text-muted">Provider jobs / scene</dt>
                  <dd>{creditQuote.providerJobsPerScene}</dd>
                </div>
              )}
            </dl>
            <p>
              Estimated credits: <strong>{videoCreditCost}</strong>
              {isLongVideo ? ` (${sceneCount} × ~${costPerClip})` : ""}
            </p>
            {usage && (
              <p className="text-muted">
                Your balance: {creditsAvailable} · Remaining after:{" "}
                <strong className={creditsRemaining < 0 ? "text-red-400" : "text-foreground"}>
                  {creditsRemaining}
                </strong>
              </p>
            )}
            {creditQuote?.usesLegacyEconomyPricing && (
              <p className="text-xs text-muted">Economy pricing — standard Giga3 video rates apply.</p>
            )}
          </div>
          {!canAffordVideo && usage && (
            <CreditPromptBanner
              variant="empty"
              message={`You need ${videoCreditCost} credits for this ${formatTargetDurationLabel(draft.targetDurationSec)} video.`}
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
              {PREPROD_VIDEO_FAILED}
              <Button
                type="button"
                variant="outline"
                className="mt-3 min-h-11"
                onClick={() =>
                  void (isLongVideo && failedScenes.length > 0
                    ? retryFailedScenes()
                    : submitVideo())
                }
              >
                {isLongVideo && failedScenes.length > 0
                  ? "Retry failed scenes only"
                  : "Retry video only"}
              </Button>
            </p>
          )}
        </section>
      )}

      {draft.step === "preview" && (
        <section className="space-y-4" aria-label="Preview and export">
          <h2 className="text-lg font-bold text-foreground">6. Preview & export</h2>
          {isLongVideo && sceneJobs.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-border bg-card/50 p-4">
              <p className="text-sm font-semibold text-foreground">
                Scene progress: {completedScenes} of {sceneJobs.length} complete
              </p>
              <div className="space-y-2">
                {sceneJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-muted/20 px-3 py-2 text-sm"
                  >
                    <span>Scene {job.sceneNumber}</span>
                    <span className="text-muted">
                      {job.status === "succeeded" && "Ready"}
                      {job.status === "generating" && "Generating…"}
                      {job.status === "pending" && "Waiting"}
                      {job.status === "failed" && (job.errorMessage || "Failed")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {processing && (
            <GenerationProgressStrip
              label={
                combining
                  ? `Stitching ${sceneCount} scenes together… ${combineProgress}%`
                  : isLongVideo && sceneJobs.some((job) => job.status === "generating")
                    ? `Generating scene ${completedScenes + 1} of ${sceneJobs.length} · ${providerDisplayName(videoJob.job?.provider)}`
                    : videoJob.job?.progressLabel
                      ? `${videoJob.job.progressLabel} · ${providerDisplayName(videoJob.job?.provider)}`
                      : "Creating your video…"
              }
              progress={
                combining
                  ? combineProgress
                  : progressForStage(videoJob.job?.progressStage)
              }
              state="processing"
            />
          )}
          {succeeded && previewUrl && (
            <>
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-200">
                <CheckCircle2 className="h-5 w-5" aria-hidden />
                {isLongVideo ? "Combined video ready" : "Video ready"}
              </div>
              <MessageMediaBlock url={previewUrl} kind="video" />
            </>
          )}
          {failed && !processing && (
            <div className="space-y-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              <div className="flex items-start gap-2">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                <span>{PREPROD_VIDEO_FAILED}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() =>
                  void (isLongVideo && failedScenes.length > 0
                    ? retryFailedScenes()
                    : submitVideo())
                }
              >
                {isLongVideo && failedScenes.length > 0
                  ? "Retry failed scenes only"
                  : "Retry video"}
              </Button>
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
